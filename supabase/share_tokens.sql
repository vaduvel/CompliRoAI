-- CompliRoAI — Magic Links / Share Tokens registry
--
-- Tokens are self-contained, HMAC-signed (no DB lookup required for verify).
-- This table is the optional registry that backs revocation, listing in
-- /dashboard/magic-links and recording usage history.
--
-- Schema is intentionally small and JSONB-friendly so we can add target
-- variations without migrations.

create table if not exists public.share_tokens (
  id text primary key,
  org_id text not null,
  created_by_user_id text not null,
  created_by_email text,
  target_type text not null,           -- 'intake' | 'approval' | 'report' | …
  target_id text,                       -- nullable (e.g. intake doesn't have one)
  target_label text,                    -- human readable, shown to receiver
  recipient_email text,                 -- where the email was sent (optional)
  status text not null default 'active',-- 'active' | 'used' | 'revoked' | 'expired'
  used_at_iso timestamptz,
  revoked_at_iso timestamptz,
  metadata jsonb default '{}'::jsonb,
  expires_at_iso timestamptz not null,
  created_at_iso timestamptz not null default now()
);

create index if not exists share_tokens_org_id_idx
  on public.share_tokens (org_id, created_at_iso desc);

create index if not exists share_tokens_status_idx
  on public.share_tokens (status);
