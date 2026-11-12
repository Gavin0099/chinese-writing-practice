create table public.family_children (
    id uuid primary key default gen_random_uuid(),
    family_id uuid not null references public.families(id) on delete cascade,
    is_primary boolean not null default true,
    unique (family_id, id)
);

create unique index family_primary_child on public.family_children (family_id) where is_primary;
alter table public.family_children enable row level security;
revoke all on public.family_children from public, anon, authenticated;
grant select on public.family_children to authenticated;
create policy read_own_children on public.family_children for select to authenticated
    using (family_id in (select id from public.families where owner_id = (select auth.uid())));

insert into public.family_children (family_id)
    select family_id from public.family_learning_records;

alter table public.family_learning_records add column child_id uuid;
update public.family_learning_records learning
    set child_id = child.id
    from public.family_children child
    where child.family_id = learning.family_id and child.is_primary;
alter table public.family_learning_records
    alter column child_id set not null,
    drop constraint family_learning_records_pkey,
    add primary key (family_id, child_id),
    add foreign key (family_id, child_id) references public.family_children(family_id, id) on delete cascade;

alter table public.families add column initial_import_fingerprint bytea;

create or replace function public.read_family_backup() returns jsonb
language sql stable security invoker set search_path = '' as $$
    select coalesce((
        select jsonb_build_object('revision', family.revision, 'backup', jsonb_build_object(
            'format', 'chinese-writing-practice-backup', 'version', 1, 'exportedAt', family.updated_at,
            'vocabulary', jsonb_build_object(
                'books', coalesce((select jsonb_agg(book.record order by book.position)
                    from public.family_class_books book where book.family_id = family.id), '[]'::jsonb),
                'words', coalesce((select jsonb_agg(word.record order by word.position)
                    from public.family_words word where word.family_id = family.id), '[]'::jsonb),
                'exams', coalesce((select jsonb_agg(exam.record order by exam.position)
                    from public.family_exams exam where exam.family_id = family.id), '[]'::jsonb)),
            'teachingProgress', learning.teaching_progress, 'writingRecords', learning.writing_records))
        from public.families family
        join public.family_children child on child.family_id = family.id and child.is_primary
        join public.family_learning_records learning on learning.family_id = family.id and learning.child_id = child.id
        where family.owner_id = (select auth.uid())
    ), jsonb_build_object('revision', 0, 'backup', null));
$$;

-- Writes pass through this transaction. The caller supplies a revision and never a family ID.
create or replace function public.save_family_backup(p_expected_revision bigint, p_backup jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
    caller_id uuid := auth.uid();
    target_family uuid;
    target_child uuid;
    current_revision bigint;
begin
    if caller_id is null or auth.jwt()->>'is_anonymous' = 'true' then
        raise exception 'authentication_required' using errcode = '42501';
    end if;
    if p_expected_revision is null or p_expected_revision < 0 or
        p_backup->>'format' is distinct from 'chinese-writing-practice-backup' or
        p_backup->'version' is distinct from '1'::jsonb or
        jsonb_typeof(p_backup#>'{vocabulary,books}') is distinct from 'array' or
        jsonb_typeof(p_backup#>'{vocabulary,words}') is distinct from 'array' or
        jsonb_typeof(p_backup#>'{vocabulary,exams}') is distinct from 'array' or
        jsonb_typeof(p_backup->'teachingProgress') is distinct from 'object' or
        jsonb_typeof(p_backup->'writingRecords') is distinct from 'object' then
        raise exception 'invalid_backup' using errcode = '22023';
    end if;

    insert into public.families (owner_id) values (caller_id) on conflict (owner_id) do nothing;
    select id, revision into target_family, current_revision from public.families
        where owner_id = caller_id for update;
    if current_revision <> p_expected_revision then
        raise exception 'family_revision_conflict' using errcode = '40001';
    end if;

    insert into public.family_children (family_id) values (target_family)
        on conflict (family_id) where is_primary do nothing;
    select id into strict target_child from public.family_children
        where family_id = target_family and is_primary;

    delete from public.family_class_books where family_id = target_family;
    insert into public.family_class_books (family_id, id, position, record)
        select target_family, entry->>'id', number, entry
        from jsonb_array_elements(p_backup#>'{vocabulary,books}') with ordinality as rows(entry, number);
    insert into public.family_words (family_id, id, book_id, position, record)
        select target_family, entry->>'id', entry->>'bookId', number, entry
        from jsonb_array_elements(p_backup#>'{vocabulary,words}') with ordinality as rows(entry, number);
    insert into public.family_exams (family_id, id, book_id, position, record)
        select target_family, entry->>'id', entry#>>'{book,id}', number, entry
        from jsonb_array_elements(p_backup#>'{vocabulary,exams}') with ordinality as rows(entry, number);
    insert into public.family_learning_records (family_id, child_id, teaching_progress, writing_records)
        values (target_family, target_child, p_backup->'teachingProgress', p_backup->'writingRecords')
        on conflict (family_id, child_id) do update set teaching_progress = excluded.teaching_progress,
            writing_records = excluded.writing_records;
    update public.families set revision = current_revision + 1, updated_at = now() where id = target_family;
    return current_revision + 1;
end;
$$;

-- The family row lock serializes the first import with every other family write.
create function public.import_family_backup(p_backup jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
    caller_id uuid := auth.uid();
    target_family uuid;
    current_revision bigint;
    imported_fingerprint bytea;
    fingerprint bytea;
begin
    if caller_id is null or auth.jwt()->>'is_anonymous' = 'true' then
        raise exception 'authentication_required' using errcode = '42501';
    end if;
    if jsonb_typeof(p_backup) is distinct from 'object' then
        raise exception 'invalid_backup' using errcode = '22023';
    end if;

    -- The browser exports a fresh timestamp for each retry. Only data persisted by save counts.
    fingerprint := sha256(convert_to(jsonb_build_array(
        p_backup->'format', p_backup->'version',
        p_backup#>'{vocabulary,books}', p_backup#>'{vocabulary,words}', p_backup#>'{vocabulary,exams}',
        p_backup->'teachingProgress', p_backup->'writingRecords'
    )::text, 'UTF8'));

    insert into public.families (owner_id) values (caller_id) on conflict (owner_id) do nothing;
    select id, revision, initial_import_fingerprint into strict target_family, current_revision, imported_fingerprint
        from public.families where owner_id = caller_id for update;
    if fingerprint = imported_fingerprint then
        return 'already_imported';
    end if;
    if current_revision <> 0 then
        raise exception 'family_already_has_data' using errcode = '23505';
    end if;

    perform public.save_family_backup(0, p_backup);
    update public.families set initial_import_fingerprint = fingerprint where id = target_family;
    return 'imported';
end;
$$;

revoke all on function public.import_family_backup(jsonb) from public, anon, authenticated;
grant execute on function public.import_family_backup(jsonb) to authenticated;
