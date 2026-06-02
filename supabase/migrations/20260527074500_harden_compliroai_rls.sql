-- Hardening pass after Supabase advisors:
-- - lock function search_path;
-- - use initplan-friendly (select auth.uid()) in RLS policies;
-- - add explicit member read policy for share_tokens.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = (select auth.uid())::text);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid())::text);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = (select auth.uid())::text)
with check (id = (select auth.uid())::text);

drop policy if exists memberships_select_own on public.memberships;
create policy memberships_select_own
on public.memberships
for select
to authenticated
using (user_id = (select auth.uid())::text);

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = organizations.id
      and m.user_id = (select auth.uid())::text
      and m.status = 'active'
  )
);

drop policy if exists org_state_select_member on public.org_state;
create policy org_state_select_member
on public.org_state
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = org_state.org_id
      and m.user_id = (select auth.uid())::text
      and m.status = 'active'
  )
);

drop policy if exists share_tokens_select_member on public.share_tokens;
create policy share_tokens_select_member
on public.share_tokens
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = share_tokens.org_id
      and m.user_id = (select auth.uid())::text
      and m.status = 'active'
  )
);

drop policy if exists ai_use_cases_select_member on public.ai_use_cases;
create policy ai_use_cases_select_member
on public.ai_use_cases
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = ai_use_cases.org_id
      and m.user_id = (select auth.uid())::text
      and m.status = 'active'
  )
  or (
    ai_use_cases.client_id is not null
    and exists (
      select 1
      from public.memberships m
      where m.org_id = ai_use_cases.client_id
        and m.user_id = (select auth.uid())::text
        and m.status = 'active'
    )
  )
);

grant select on public.share_tokens to authenticated;
