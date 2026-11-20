begin;

insert into auth.users (id, email) values
    ('10000000-0000-0000-0000-000000000001', 'family-a@example.test'),
    ('10000000-0000-0000-0000-000000000002', 'family-b@example.test');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","is_anonymous":false}', true);

do $$
declare
    fixture jsonb := $json${
        "format":"chinese-writing-practice-backup","version":1,
        "vocabulary":{"books":[{"id":"shared-id","name":"A 班"}],
            "words":[{"id":"word","bookId":"shared-id","word":"晴天"}],
            "exams":[{"id":"exam","book":{"id":"shared-id"},"questions":[{"word":"晴天"}]}]},
        "teachingProgress":{"records":[]},"writingRecords":{"天":[{"status":"can_write"}]},
        "curriculum":{"must_not_be_stored":true}
    }$json$;
    state jsonb;
    child uuid;
begin
    if public.read_family_backup() <> '{"revision":0,"backup":null}'::jsonb then
        raise exception 'a new account did not start empty';
    end if;
    if public.import_family_backup(fixture) <> 'imported' then raise exception 'first import failed'; end if;
    state := public.read_family_backup();
    if state->'revision' is distinct from '1'::jsonb or state#>>'{backup,vocabulary,words,0,word}' is distinct from '晴天' or
        state#>'{backup,curriculum}' is not null or
        state#>>'{backup,writingRecords,天,0,status}' is distinct from 'can_write' then
        raise exception 'saved family data did not round trip';
    end if;
    select id into strict child from public.family_children where is_primary;
    if not exists (select from public.family_learning_records where child_id = child and family_id <> child) then
        raise exception 'learning records do not use a separate child ID';
    end if;
    perform set_config('cwp.qa.family_a', (select id::text from public.families), true);
    if public.import_family_backup(fixture || '{"exportedAt":"2026-12-01T00:00:00Z"}') <> 'already_imported' or
        public.read_family_backup() <> state then
        raise exception 'retry duplicated data or advanced the revision';
    end if;
    begin
        perform public.save_family_backup(0, fixture);
        raise exception 'a stale writer overwrote the family';
    exception when sqlstate 'PT409' then null;
    end;
    begin
        perform public.save_family_backup(1, jsonb_set(fixture, '{vocabulary,words,0,bookId}', '"missing"'));
        raise exception 'a word without a valid class book was saved';
    exception when foreign_key_violation then null;
    end;
    if public.read_family_backup() <> state then raise exception 'the failed write changed the saved family'; end if;
    if public.save_family_backup(1, jsonb_set(fixture, '{vocabulary,words,0,word}', '"青蛙"')) <> 2 then
        raise exception 'post-import save failed';
    end if;
    state := public.read_family_backup();
    if public.import_family_backup(fixture) <> 'already_imported' or public.read_family_backup() <> state or
        (select id from public.family_children where is_primary) is distinct from child then
        raise exception 'retry overwrote later changes or recreated the child';
    end if;
    begin
        perform public.import_family_backup(jsonb_set(fixture, '{writingRecords}', '{}'));
        raise exception 'first import overwrote existing cloud data';
    exception when unique_violation then
        if sqlerrm <> 'family_already_has_data' then raise; end if;
    end;
    if public.read_family_backup() <> state then raise exception 'a refused import changed cloud data'; end if;
    begin
        update public.family_words set record = '{}'::jsonb;
        raise exception 'direct writes bypassed revision control';
    exception when insufficient_privilege then null;
    end;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","is_anonymous":false}', true);

do $$
declare
    family_a uuid := current_setting('cwp.qa.family_a')::uuid;
begin
    if exists (select from public.families) or exists (select from public.family_children) or exists (select from public.family_learning_records) or
        exists (select from public.family_class_books) or exists (select from public.family_words) or
        exists (select from public.family_exams) or public.read_family_backup()->'backup' <> 'null'::jsonb then
        raise exception 'another account could read the first family';
    end if;
    begin
        insert into public.family_words (family_id, id, book_id, position, record)
            values (family_a, 'new-word', 'shared-id', 2, '{}');
        raise exception 'another account could insert a family word';
    exception when insufficient_privilege then null;
    end;
    begin
        update public.family_words set record = '{}'::jsonb where family_id = family_a and id = 'word';
        raise exception 'another account could update a family word';
    exception when insufficient_privilege then null;
    end;
    begin
        delete from public.family_words where family_id = family_a and id = 'word';
        raise exception 'another account could delete a family word';
    exception when insufficient_privilege then null;
    end;
    perform public.save_family_backup(0, '{
        "format":"chinese-writing-practice-backup","version":1,
        "vocabulary":{"books":[{"id":"shared-id","name":"B 班"}],"words":[],"exams":[]},
        "teachingProgress":{},"writingRecords":{}}'::jsonb);
    if (select count(*) from public.family_class_books) <> 1 or
        (select record->>'name' from public.family_class_books) <> 'B 班' then
        raise exception 'class IDs were not scoped to a family';
    end if;
end;
$$;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","is_anonymous":true}', true);
do $$
begin
    begin
        perform public.save_family_backup(1, '{}'::jsonb);
        raise exception 'anonymous Auth sessions could write through the family RPC';
    exception when insufficient_privilege then null;
    end;
    begin
        perform public.import_family_backup('{}'::jsonb);
        raise exception 'anonymous Auth sessions could import a backup';
    exception when insufficient_privilege then null;
    end;
end;
$$;

set local role anon;
do $$
begin
    begin
        perform public.read_family_backup();
        raise exception 'anonymous callers could access the family RPC';
    exception when insufficient_privilege then null;
    end;
    begin
        perform public.save_family_backup(0, '{}'::jsonb);
        raise exception 'anonymous callers could write through the family RPC';
    exception when insufficient_privilege then null;
    end;
end;
$$;

rollback;
select 'family and child isolation, import replay, revisions, rollback and anonymous access checks passed' as result;
