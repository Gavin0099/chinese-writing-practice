create table public.review_attempts (
    owner_id uuid not null references auth.users(id) on delete cascade,
    attempt_id text collate "C" not null check (attempt_id ~ '^[A-Za-z0-9_-]{1,128}$'),
    attempt jsonb not null,
    primary key (owner_id, attempt_id),
    check (jsonb_typeof(attempt) = 'object' and (attempt ->> 'id' = attempt_id) is true)
);

alter table public.review_attempts enable row level security;
revoke all on public.review_attempts from public, anon, authenticated, service_role;
grant select on public.review_attempts to authenticated;
create policy review_attempts_read on public.review_attempts
    for select to authenticated
    using (
        owner_id = (select auth.uid())
        and (select auth.jwt() ->> 'is_anonymous') is distinct from 'true'
    );

-- Only this entry point can insert. Its owner always comes from the signed JWT.
create function public.append_review_attempts(p_attempts jsonb)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
    actor uuid := auth.uid();
    entry jsonb;
    question jsonb;
    stored jsonb;
    entry_id text;
begin
    if actor is null or (auth.jwt() ->> 'is_anonymous') = 'true' then
        raise exception using errcode = '42501', message = 'review_account_required';
    end if;
    if jsonb_typeof(p_attempts) is distinct from 'array' then
        raise exception using errcode = '22023', message = 'invalid_review_batch';
    end if;
    if jsonb_array_length(p_attempts) not between 1 and 25 or octet_length(p_attempts::text) > 1048576 then
        raise exception using errcode = '22023', message = 'invalid_review_batch';
    end if;

    -- Acquire locks in the same order even if concurrent imports submit different orders.
    for entry in select value from jsonb_array_elements(p_attempts) order by (value ->> 'id') collate "C" loop
        entry_id := entry ->> 'id';
        if jsonb_typeof(entry) is distinct from 'object'
            or jsonb_typeof(entry -> 'id') is distinct from 'string'
            or entry_id !~ '^[A-Za-z0-9_-]{1,128}$'
            or jsonb_typeof(entry -> 'bookId') is distinct from 'string'
            or length(entry ->> 'bookId') not between 1 and 256
            or jsonb_typeof(entry -> 'at') is distinct from 'string'
            or (entry ->> 'at') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$'
            or (entry ->> 'source' in ('exam', 'paper')) is not true
            or (entry ->> 'source' = 'exam' and (
                jsonb_typeof(entry -> 'examId') is distinct from 'string'
                or length(entry ->> 'examId') not between 1 and 256))
            or (entry ->> 'source' = 'paper' and (entry -> 'examId') is distinct from 'null'::jsonb)
            or jsonb_typeof(entry -> 'items') is distinct from 'array' then
            raise exception using errcode = '22023', message = 'invalid_review_attempt';
        end if;
        perform (entry ->> 'at')::timestamptz;
        if jsonb_array_length(entry -> 'items') not between 1 and 60 then
            raise exception using errcode = '22023', message = 'invalid_review_attempt';
        end if;
        if entry ->> 'source' = 'paper' and (
            jsonb_array_length(entry -> 'items') <> 1
            or (entry #> '{items,0,wrong}') is distinct from 'true'::jsonb
        ) then
            raise exception using errcode = '22023', message = 'invalid_review_attempt';
        end if;
        for question in select value from jsonb_array_elements(entry -> 'items') loop
            if jsonb_typeof(question) is distinct from 'object'
                or jsonb_typeof(question -> 'lesson') is distinct from 'number'
                or (question ->> 'lesson') !~ '^(?:[1-9]|[1-5][0-9]|60)$'
                or jsonb_typeof(question -> 'word') is distinct from 'string'
                or length(question ->> 'word') not between 1 and 10
                or jsonb_typeof(question -> 'pronunciation') is distinct from 'array'
                or jsonb_typeof(question -> 'blanks') is distinct from 'array'
                or jsonb_typeof(question -> 'wrong') is distinct from 'boolean' then
                raise exception using errcode = '22023', message = 'invalid_review_question';
            end if;
            if jsonb_array_length(question -> 'pronunciation') <> length(question ->> 'word')
                or exists (select from jsonb_array_elements(question -> 'pronunciation') as syllable(value)
                    where jsonb_typeof(value) <> 'string' or value #>> '{}' !~ '[ㄅ-ㄩ]'
                      or value #>> '{}' !~ '^(˙[ㄅ-ㄙ]?[ㄧ-ㄩ]?[ㄚ-ㄦ]?|[ㄅ-ㄙ]?[ㄧ-ㄩ]?[ㄚ-ㄦ]?[ˊˇˋ]?)$')
                or jsonb_array_length(question -> 'blanks') not between 1 and length(question ->> 'word')
                or exists (select from jsonb_array_elements(question -> 'blanks') as blank(value)
                    where case when jsonb_typeof(value) = 'number' and value::text ~ '^([1-9]|10)$'
                        then (value::text)::int > length(question ->> 'word') else true end) then
                raise exception using errcode = '22023', message = 'invalid_review_question';
            end if;
        end loop;

        insert into public.review_attempts(owner_id, attempt_id, attempt)
            values (actor, entry_id, entry)
            on conflict (owner_id, attempt_id) do nothing;
        if not found then
            select r.attempt into stored from public.review_attempts as r
                where r.owner_id = actor and r.attempt_id = entry_id;
            if stored is distinct from entry then
                raise exception using errcode = 'PT409', message = 'review_attempt_conflict';
            end if;
        end if;
    end loop;
    return jsonb_array_length(p_attempts);
end;
$$;

revoke all on function public.append_review_attempts(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.append_review_attempts(jsonb) to authenticated;
