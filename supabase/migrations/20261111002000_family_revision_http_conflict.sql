-- Return an HTTP 409 through PostgREST for a stale application revision.
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
        raise exception 'family_revision_conflict' using errcode = 'PT409';
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
