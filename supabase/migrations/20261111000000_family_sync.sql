create table public.families (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null unique references auth.users(id) on delete cascade,
    revision bigint not null default 0 check (revision >= 0),
    updated_at timestamptz not null default now()
);

-- The existing app has one learner per family. These are the learner's records.
create table public.family_learning_records (
    family_id uuid primary key references public.families(id) on delete cascade,
    teaching_progress jsonb not null check (jsonb_typeof(teaching_progress) = 'object'),
    writing_records jsonb not null check (jsonb_typeof(writing_records) = 'object')
);

create table public.family_class_books (
    family_id uuid not null references public.families(id) on delete cascade,
    id text not null check (btrim(id) <> ''),
    position integer not null check (position > 0),
    record jsonb not null check (jsonb_typeof(record) = 'object'),
    primary key (family_id, id)
);

create table public.family_words (
    family_id uuid not null,
    id text not null check (btrim(id) <> ''),
    book_id text not null,
    position integer not null check (position > 0),
    record jsonb not null check (jsonb_typeof(record) = 'object'),
    primary key (family_id, id),
    foreign key (family_id, book_id) references public.family_class_books(family_id, id) on delete cascade
);

create table public.family_exams (
    family_id uuid not null,
    id text not null check (btrim(id) <> ''),
    book_id text not null,
    position integer not null check (position > 0),
    layout_version smallint not null default 1 check (layout_version > 0),
    record jsonb not null check (jsonb_typeof(record) = 'object'),
    primary key (family_id, id),
    foreign key (family_id, book_id) references public.family_class_books(family_id, id) on delete cascade
);

create index family_words_book on public.family_words (family_id, book_id);
create index family_exams_book on public.family_exams (family_id, book_id);

alter table public.families enable row level security;
alter table public.family_learning_records enable row level security;
alter table public.family_class_books enable row level security;
alter table public.family_words enable row level security;
alter table public.family_exams enable row level security;

revoke all on public.families, public.family_learning_records, public.family_class_books,
    public.family_words, public.family_exams from public, anon, authenticated;
grant select on public.families, public.family_learning_records, public.family_class_books,
    public.family_words, public.family_exams to authenticated;

create policy read_own_family on public.families for select to authenticated
    using (owner_id = (select auth.uid()));
create policy read_own_learning on public.family_learning_records for select to authenticated
    using (family_id in (select id from public.families where owner_id = (select auth.uid())));
create policy read_own_books on public.family_class_books for select to authenticated
    using (family_id in (select id from public.families where owner_id = (select auth.uid())));
create policy read_own_words on public.family_words for select to authenticated
    using (family_id in (select id from public.families where owner_id = (select auth.uid())));
create policy read_own_exams on public.family_exams for select to authenticated
    using (family_id in (select id from public.families where owner_id = (select auth.uid())));

create function public.read_family_backup() returns jsonb
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
        join public.family_learning_records learning on learning.family_id = family.id
        where family.owner_id = (select auth.uid())
    ), jsonb_build_object('revision', 0, 'backup', null));
$$;

-- Writes pass through this transaction. The caller supplies a revision and never a family ID.
create function public.save_family_backup(p_expected_revision bigint, p_backup jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
    caller_id uuid := auth.uid();
    target_family uuid;
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
    insert into public.family_learning_records (family_id, teaching_progress, writing_records)
        values (target_family, p_backup->'teachingProgress', p_backup->'writingRecords')
        on conflict (family_id) do update set teaching_progress = excluded.teaching_progress,
            writing_records = excluded.writing_records;
    update public.families set revision = current_revision + 1, updated_at = now() where id = target_family;
    return current_revision + 1;
end;
$$;

revoke all on function public.read_family_backup(), public.save_family_backup(bigint, jsonb)
    from public, anon, authenticated;
grant execute on function public.read_family_backup(), public.save_family_backup(bigint, jsonb) to authenticated;
