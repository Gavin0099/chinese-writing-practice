begin;
insert into auth.users (id, email) values
    ('10202611-0000-0000-0000-000000000001', 'review-a@example.test'),
    ('10202611-0000-0000-0000-000000000002', 'review-b@example.test');

select set_config('cwp.qa.review', '{"id":"original","bookId":"class","at":"2026-11-12T01:00:00.000Z",
    "source":"paper","examId":null,"items":[{"word":"天空","lesson":1,"wrong":true,
    "pronunciation":["ㄊㄧㄢ","ㄎㄨㄥ"],"blanks":[1]}]}', true);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10202611-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10202611-0000-0000-0000-000000000001","is_anonymous":false}', true);

do $$
declare
    attempt jsonb := current_setting('cwp.qa.review')::jsonb;
begin
    if public.append_review_attempts(jsonb_build_array(attempt)) <> 1 or
        public.append_review_attempts(jsonb_build_array(attempt)) <> 1 then
        raise exception 'idempotent append failed';
    end if;
    if (select count(*) from public.review_attempts) <> 1 then
        raise exception 'retry inserted duplicate rows';
    end if;
    begin
        perform public.append_review_attempts(jsonb_build_array(
            attempt || '{"id":"a-new"}', attempt || '{"at":"2026-11-12T02:00:00.000Z"}'));
        raise exception 'same ID with different content accepted';
    exception when sqlstate 'PT409' then null;
    end;
    begin
        perform public.append_review_attempts(jsonb_build_array(
            attempt || '{"id":"a-new"}',
            jsonb_set(attempt || '{"id":"invalid"}', '{items,0,blanks}', '[99]')));
        raise exception 'invalid blank accepted';
    exception when invalid_parameter_value then null;
    end;
    if (select count(*) from public.review_attempts) <> 1 or
        (select r.attempt from public.review_attempts as r) <> attempt then
        raise exception 'failed append changed persisted rows';
    end if;
    begin
        delete from public.review_attempts;
        raise exception 'delete was permitted';
    exception when insufficient_privilege then null;
    end;
    begin
        insert into public.review_attempts values ('10202611-0000-0000-0000-000000000002','original',attempt);
        raise exception 'direct cross-account insert was permitted';
    exception when insufficient_privilege then null;
    end;
end
$$;

select set_config('request.jwt.claim.sub', '10202611-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10202611-0000-0000-0000-000000000002","is_anonymous":false}', true);
do $$
declare
    attempt jsonb := current_setting('cwp.qa.review')::jsonb || '{"at":"2026-11-12T03:00:00.000Z"}';
begin
    if exists (select from public.review_attempts) then raise exception 'account A leaked'; end if;
    perform public.append_review_attempts(jsonb_build_array(attempt));
    if (select r.attempt from public.review_attempts as r) <> attempt then
        raise exception 'a second owner cannot use the same ID independently';
    end if;
end
$$;

select set_config('request.jwt.claims', '{"sub":"10202611-0000-0000-0000-000000000002","is_anonymous":true}', true);
do $$
begin
    if exists (select from public.review_attempts) then raise exception 'anonymous auth account can read'; end if;
    begin
        perform public.append_review_attempts(jsonb_build_array(current_setting('cwp.qa.review')::jsonb));
        raise exception 'anonymous auth account can write';
    exception when insufficient_privilege then null;
    end;
end
$$;
set local role anon;
do $$
begin
    begin
        perform 1 from public.review_attempts;
        raise exception 'anonymous REST role can read';
    exception when insufficient_privilege then null;
    end;
end
$$;
rollback;
