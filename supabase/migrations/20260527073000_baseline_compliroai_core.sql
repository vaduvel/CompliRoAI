-- CompliRoAI production baseline.
-- Runtime contract: Next.js server routes use service-role REST for auth
-- profiles, organizations, memberships, org_state, share_tokens and the
-- AIUseCase register. RLS remains enabled on every public table as defense in
-- depth for Supabase Data API exposure.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id text primary key,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.organizations (
  id text primary key,
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create table if not exists public.memberships (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  org_id text not null references public.organizations(id) on delete cascade,
  role text not null check (role in ('owner', 'partner_manager', 'compliance', 'reviewer', 'viewer')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, org_id, role)
);

create index if not exists memberships_user_id_idx
  on public.memberships (user_id, status, created_at);

create index if not exists memberships_org_id_idx
  on public.memberships (org_id, status, role);

drop trigger if exists memberships_set_updated_at on public.memberships;
create trigger memberships_set_updated_at
before update on public.memberships
for each row execute function public.set_updated_at();

create table if not exists public.org_state (
  org_id text primary key references public.organizations(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists org_state_set_updated_at on public.org_state;
create trigger org_state_set_updated_at
before update on public.org_state
for each row execute function public.set_updated_at();

create table if not exists public.share_tokens (
  id text primary key,
  org_id text not null references public.organizations(id) on delete cascade,
  created_by_user_id text not null,
  created_by_email text,
  target_type text not null check (target_type in ('intake', 'approval', 'report')),
  target_id text,
  target_label text,
  recipient_email text,
  status text not null default 'active' check (status in ('active', 'used', 'revoked', 'expired')),
  used_at_iso timestamptz,
  revoked_at_iso timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  expires_at_iso timestamptz not null,
  created_at_iso timestamptz not null default now()
);

create index if not exists share_tokens_org_id_idx
  on public.share_tokens (org_id, created_at_iso desc);

create index if not exists share_tokens_status_idx
  on public.share_tokens (status);

create table if not exists public.ai_use_cases (
  id text primary key,
  org_id text not null references public.organizations(id) on delete cascade,
  workspace_mode text not null check (workspace_mode in ('cabinet', 'imm-classic', 'ai-builder', 'imm_classic', 'ai_builder')),
  client_id text references public.organizations(id) on delete cascade,
  ai_project_id text,
  linked_ai_system_id text,
  linked_vendor_id text,
  linked_model_id text,
  linked_data_process_id text,

  use_case_name text not null,
  short_description text,
  department text not null,
  business_process text not null,
  lifecycle_status text not null,
  owner_name text,
  owner_email text,
  owner_role text,

  intended_purpose text not null,
  actual_use_description text,
  out_of_scope_use text,

  tool_name text,
  vendor_name text,
  model_name text,
  deployment_mode text not null default 'unknown',

  internal_users jsonb not null default '[]'::jsonb,
  affected_persons jsonb not null default '[]'::jsonb,
  vulnerable_groups jsonb not null default '[]'::jsonb,

  uses_personal_data text not null default 'unknown' check (uses_personal_data in ('yes', 'no', 'unknown')),
  uses_special_category_data text not null default 'unknown' check (uses_special_category_data in ('yes', 'no', 'unknown')),
  uses_confidential_data text not null default 'unknown' check (uses_confidential_data in ('yes', 'no', 'unknown')),
  uses_trade_secrets text not null default 'unknown' check (uses_trade_secrets in ('yes', 'no', 'unknown')),
  uses_children_data text not null default 'unknown' check (uses_children_data in ('yes', 'no', 'unknown')),
  data_categories jsonb not null default '[]'::jsonb,
  input_data_source jsonb not null default '[]'::jsonb,
  data_region text default 'unknown',
  transfer_outside_eea text not null default 'unknown' check (transfer_outside_eea in ('yes', 'no', 'unknown')),

  output_types jsonb not null default '[]'::jsonb,
  autonomy_level text not null default 'unknown',
  human_review text not null default 'unknown',
  public_output text not null default 'unknown' check (public_output in ('yes', 'no', 'unknown')),
  direct_interaction_with_persons text not null default 'unknown' check (direct_interaction_with_persons in ('yes', 'no', 'unknown')),
  automated_decision text not null default 'unknown' check (automated_decision in ('yes', 'no', 'unknown')),
  scoring_or_ranking text not null default 'unknown' check (scoring_or_ranking in ('yes', 'no', 'unknown')),
  impacts_people_rights text not null default 'unknown' check (impacts_people_rights in ('yes', 'no', 'unknown')),

  annex_iii_domain text not null default 'unknown',
  prohibited_practice_flags jsonb not null default '[]'::jsonb,

  draft_role text not null default 'unknown',
  draft_risk_level text not null default 'unknown',
  high_risk_candidate boolean not null default false,
  prohibited_candidate boolean not null default false,
  art50_transparency_trigger boolean not null default false,
  gdpr_review_needed boolean not null default false,
  dpi_needs_review boolean not null default false,
  fria_candidate boolean not null default false,
  vendor_review_needed boolean not null default false,
  human_oversight_needed boolean not null default false,
  logging_review_needed boolean not null default false,
  qms_review_needed boolean not null default false,
  pmm_review_needed boolean not null default false,
  incident_process_needed boolean not null default false,

  certainty_status text not null default 'unknown',
  review_status text not null default 'draft',
  evidence_completeness_pct integer not null default 0 check (evidence_completeness_pct between 0 and 100),
  open_findings_count integer not null default 0,
  last_reviewed_at timestamptz,
  last_reviewed_by text,
  approved_at timestamptz,
  approved_by text,

  source text not null default 'manual',
  source_import_id text,
  source_row_number integer,
  source_magic_link_token text,
  source_confidence_pct integer check (source_confidence_pct is null or source_confidence_pct between 0 and 100),

  consultant_notes text,
  internal_notes text,

  dedupe_key text not null,
  audit_version integer not null default 1,
  created_at timestamptz not null default now(),
  created_by text not null,
  updated_at timestamptz not null default now(),
  updated_by text,
  archived_at timestamptz,
  archived_by text
);

create index if not exists ai_use_cases_org_idx
  on public.ai_use_cases (org_id);

create index if not exists ai_use_cases_client_idx
  on public.ai_use_cases (client_id);

create index if not exists ai_use_cases_system_idx
  on public.ai_use_cases (linked_ai_system_id);

create index if not exists ai_use_cases_risk_idx
  on public.ai_use_cases (draft_risk_level, review_status);

create unique index if not exists ai_use_cases_org_dedupe_active_idx
  on public.ai_use_cases (org_id, dedupe_key)
  where archived_at is null;

create index if not exists ai_use_cases_data_categories_gin
  on public.ai_use_cases using gin (data_categories);

create index if not exists ai_use_cases_output_types_gin
  on public.ai_use_cases using gin (output_types);

drop trigger if exists ai_use_cases_set_updated_at on public.ai_use_cases;
create trigger ai_use_cases_set_updated_at
before update on public.ai_use_cases
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.org_state enable row level security;
alter table public.share_tokens enable row level security;
alter table public.ai_use_cases enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid()::text);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid()::text);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid()::text)
with check (id = auth.uid()::text);

drop policy if exists memberships_select_own on public.memberships;
create policy memberships_select_own
on public.memberships
for select
to authenticated
using (user_id = auth.uid()::text);

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
      and m.user_id = auth.uid()::text
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
      and m.user_id = auth.uid()::text
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
      and m.user_id = auth.uid()::text
      and m.status = 'active'
  )
  or (
    ai_use_cases.client_id is not null
    and exists (
      select 1
      from public.memberships m
      where m.org_id = ai_use_cases.client_id
        and m.user_id = auth.uid()::text
        and m.status = 'active'
    )
  )
);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on public.profiles to authenticated;
grant select on public.organizations to authenticated;
grant select on public.memberships to authenticated;
grant select on public.org_state to authenticated;
grant select on public.ai_use_cases to authenticated;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.organizations to service_role;
grant select, insert, update, delete on public.memberships to service_role;
grant select, insert, update, delete on public.org_state to service_role;
grant select, insert, update, delete on public.share_tokens to service_role;
grant select, insert, update, delete on public.ai_use_cases to service_role;
