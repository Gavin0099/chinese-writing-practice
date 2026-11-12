-- Shared curriculum data is separate from family backups and progress.
create schema curriculum_internal;
revoke all on schema curriculum_internal from public, anon, authenticated, service_role;

create table curriculum_internal.staged_courses (
    batch text not null,
    course_key text not null,
    course jsonb not null check (jsonb_typeof(course) = 'object'),
    primary key (batch, course_key)
);

create table curriculum_internal.review_access (
    batch text not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    primary key (batch, user_id)
);

revoke all on table curriculum_internal.staged_courses, curriculum_internal.review_access
    from public, anon, authenticated, service_role;
alter table curriculum_internal.staged_courses enable row level security;
alter table curriculum_internal.review_access enable row level security;

-- Development access is opt-in per batch and user; sign-in alone grants nothing.
create function public.read_review_curriculum()
returns table (course_key text, course jsonb)
language sql stable security definer
set search_path = ''
as $$
    select c.course_key, c.course
    from curriculum_internal.staged_courses as c
    join curriculum_internal.review_access as a on a.batch = c.batch
    where a.user_id = (select auth.uid())
      and (select auth.jwt() ->> 'is_anonymous') is distinct from 'true'
$$;
revoke all on function public.read_review_curriculum() from public, anon, authenticated, service_role;
grant execute on function public.read_review_curriculum() to authenticated;

-- Only material cleared for public use belongs here. This migration publishes no rows.
create table public.curriculum_catalog (
    course_key text primary key,
    course jsonb not null check (jsonb_typeof(course) = 'object'),
    approval_reference text not null check (length(btrim(approval_reference)) > 0)
);
alter table public.curriculum_catalog enable row level security;
revoke all on table public.curriculum_catalog from public, anon, authenticated, service_role;
grant select (course_key, course) on table public.curriculum_catalog to anon, authenticated;
create policy curriculum_catalog_read on public.curriculum_catalog
    for select to anon, authenticated using (true);
