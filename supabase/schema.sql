-- Easy Digital Signatures. Safe to re-run (IF NOT EXISTS).
-- Apply in the Supabase SQL editor, or let the server apply it when AUTO_MIGRATE=1.
-- The server connects with the service role / database password and bypasses RLS.
-- rls.sql locks the same tables against the public anon key.

create table if not exists profiles (
  id uuid primary key,
  email text unique not null,
  canonical_email text,
  full_name text not null default '',
  password_hash text,
  email_verified_at timestamptz,
  email_verify_token text,
  phone_e164 text,
  phone_verified_at timestamptz,
  phone_line_type text,
  created_ip text,
  first_send_ip text,
  stripe_customer_id text,
  free_claimed_at timestamptz,
  free_block_reason text,
  brand jsonb not null default '{"company":"","color":"#0f766e"}'::jsonb,
  folders jsonb not null default '["All","Sales","HR","Real Estate","Legal"]'::jsonb,
  proposal jsonb,
  created_at timestamptz not null default now()
);

create table if not exists entitlements (
  user_id uuid primary key references profiles(id) on delete cascade,
  credits integer not null default 0,
  subscription_status text not null default 'none',
  subscription_id text,
  price_id text,
  period_start timestamptz,
  period_end timestamptz,
  docs_used_period integer not null default 0,
  monthly_quota integer not null default 100
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  folder text not null default 'Sales',
  ordered_sign boolean not null default true,
  expires_days integer not null default 30,
  remind_days integer not null default 3,
  message text not null default 'Please review and sign.',
  idv boolean not null default false,
  is_template boolean not null default false,
  original_path text,
  final_path text,
  original_sha256 text,
  content_sha256 text,
  final_sha256 text,
  billing_source text,
  stripe_session_id text,
  sent_at timestamptz,
  completed_at timestamptz,
  last_reminded_at timestamptz,
  fields jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  replaces uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_owner_idx on documents (owner_id, created_at desc);

create table if not exists signers (
  id uuid primary key,
  document_id uuid not null references documents(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'signer',
  color text not null default '#2563eb',
  sort_index integer not null default 0,
  token text,
  token_hash text unique,
  access_code_hash text,
  viewed_at timestamptz,
  signed_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  consent_at timestamptz,
  consent_text text,
  consent_version text,
  consent_ip text,
  consent_ua text,
  sign_ip text,
  sign_ua text,
  view_ip text,
  view_ua text
);
create index if not exists signers_document_idx on signers (document_id, sort_index);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  signer_id uuid,
  event_type text not null,
  actor text,
  email text,
  ip text,
  user_agent text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_doc_idx on audit_events (document_id, created_at);

create table if not exists signing_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  template_id uuid not null references documents(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  responses integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  stripe_session_id text unique not null,
  kind text not null,
  amount_cents integer not null default 0,
  card_fingerprint text,
  document_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists card_fingerprints (
  fingerprint text primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists free_phone_claims (
  phone_e164 text primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists free_email_claims (
  canonical_email text primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists free_device_claims (
  device_key text primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists free_ip_claims (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists free_ip_claims_ip_idx on free_ip_claims (ip, created_at);

create table if not exists signup_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);
create index if not exists signup_attempts_ip_idx on signup_attempts (ip, created_at);

create table if not exists phone_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  phone_e164 text not null,
  code_hash text,
  line_type text,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists stripe_events (
  id text primary key,
  created_at timestamptz not null default now()
);

create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limits_bucket_idx on rate_limits (bucket, created_at);

-- Promo codes. Each code grants free documents per account, used before paid credits.
-- Turning a code off (active=false) blocks new redemptions and any unused promo documents from it.
create table if not exists promo_codes (
  code text primary key,
  free_docs_per_user integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  code text not null references promo_codes(code) on delete cascade,
  docs_granted integer not null,
  docs_used integer not null default 0,
  redeemed_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (user_id, code)
);
create index if not exists promo_redemptions_code_idx on promo_redemptions (code, redeemed_at desc);

alter table promo_codes enable row level security;
alter table promo_redemptions enable row level security;

insert into promo_codes (code, free_docs_per_user, active) values ('VIP100', 100, true), ('VIP50', 50, true), ('VIP10', 10, true) on conflict (code) do nothing;

alter table profiles add column if not exists blocked_at timestamptz;

-- Owner admin: support inbox (contact form + AI Help questions) and recent server errors.
create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  name text,
  email text,
  document_id text,
  message text not null,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_created_idx on support_messages (created_at desc);

create table if not exists error_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists error_log_created_idx on error_log (created_at desc);

alter table support_messages enable row level security;
alter table error_log enable row level security;

-- Reminders: per-document auto reminders (remind_days 0=off, 2, 3, 7) capped at 5,
-- account defaults, and optional sender follow-up digests.
alter table documents add column if not exists auto_reminders integer not null default 0;
alter table profiles add column if not exists default_remind_days integer not null default 3;
alter table profiles add column if not exists sender_nudge_days integer not null default 0;
alter table profiles add column if not exists last_nudged_at timestamptz;

-- Expiry warnings: unsigned signers and the sender get an email 2 days before a link expires.
alter table documents add column if not exists expiry_warned_at timestamptz;

-- API keys and webhooks for the developer API.
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists api_keys_user_idx on api_keys (user_id, created_at desc);

create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  url text not null,
  secret text not null,
  events text[] not null default '{document.signed,document.declined,document.expired}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_status integer,
  last_error text,
  last_sent_at timestamptz
);
create index if not exists webhooks_user_idx on webhooks (user_id, created_at desc);

-- Teams: shared templates and a shared credit pool.
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles(id),
  credits integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create unique index if not exists team_members_user_idx on team_members (user_id);
create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token_hash text not null unique,
  invited_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null
);
create index if not exists team_invites_email_idx on team_invites (email, accepted_at);
alter table documents add column if not exists team_id uuid references teams(id) on delete set null;
create index if not exists documents_team_idx on documents (team_id) where team_id is not null;

-- Clickwrap acceptance of the Terms at signup.
alter table profiles add column if not exists terms_accepted_at timestamptz;
alter table profiles add column if not exists terms_version text;
alter table profiles add column if not exists terms_accepted_ip text;

-- Per-user favorite field types in the editor library.
alter table profiles add column if not exists favorite_fields jsonb not null default '["signature","initials"]'::jsonb;

-- First-party, cookie-free funnel events: an anonymous per-tab id (sessionStorage), never an IP or email.
-- Signups, verifications, sends, and purchases are counted from their own tables; this holds the steps before them.
create table if not exists funnel_events (
  id bigserial primary key,
  name text not null,
  sid text,
  user_id uuid,
  path text,
  source text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists funnel_events_created_idx on funnel_events (created_at desc);
create index if not exists funnel_events_name_idx on funnel_events (name, created_at desc);
alter table funnel_events enable row level security;

-- Evidence: hash-chained, append-only audit trail; retention records; email delivery tracking; 2FA.
alter table audit_events add column if not exists seq integer;
alter table audit_events add column if not exists prev_hash text;
alter table audit_events add column if not exists event_hash text;
alter table audit_events add column if not exists payload text;
create unique index if not exists audit_events_doc_seq_idx on audit_events (document_id, seq);
alter table documents add column if not exists audit_seal_hash text;
alter table documents add column if not exists content_deleted_at timestamptz;
create index if not exists documents_final_sha_idx on documents (final_sha256) where final_sha256 is not null;

-- Chain any events written before hash chaining existed, oldest first (one-time; skips rows already chained).
do $$ declare r record; prev text; n integer; cur uuid; p text; begin cur := null; for r in select id, document_id, signer_id, event_type, actor, email, ip, user_agent, meta, created_at from audit_events where seq is null and not exists (select 1 from audit_events x where x.document_id = audit_events.document_id and x.seq is not null) order by document_id, created_at, id loop if cur is distinct from r.document_id then cur := r.document_id; prev := null; n := 0; end if; n := n + 1; p := jsonb_build_object('v', 1, 'doc', r.document_id, 'seq', n, 'type', r.event_type, 'actor', r.actor, 'email', r.email, 'ip', r.ip, 'ua', r.user_agent, 'signer', r.signer_id, 'meta', r.meta, 'at', to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'legacy', true)::text; update audit_events set seq = n, prev_hash = prev, payload = p, event_hash = encode(sha256(convert_to(coalesce(prev, '') || '|' || p, 'UTF8')), 'hex') where id = r.id; select event_hash into prev from audit_events where id = r.id; end loop; end $$;

-- Retention snapshot of each sent document's audit trail. Kept even if the document or account is deleted.
create table if not exists audit_records (
  id bigserial primary key,
  document_id uuid not null,
  owner_id uuid,
  owner_email text,
  document_name text,
  status text not null,
  sent_at timestamptz,
  completed_at timestamptz,
  original_sha256 text,
  content_sha256 text,
  final_sha256 text,
  signer_count integer not null default 0,
  signers jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  chain_head text,
  chain_length integer not null default 0,
  chain_ok boolean,
  reason text,
  retain_until timestamptz not null,
  created_at timestamptz not null default now()
);
create unique index if not exists audit_records_doc_reason_idx on audit_records (document_id, reason);
create index if not exists audit_records_final_idx on audit_records (final_sha256);
alter table audit_records enable row level security;

-- Append-only guards. UPDATE is always rejected. DELETE needs eds.audit_purge='on' set in the same transaction
-- (only used for drafts that were never sent, and for whole-account deletion after retention snapshots exist).
create or replace function eds_audit_events_guard() returns trigger language plpgsql as $$ begin if tg_op = 'UPDATE' then raise exception 'audit_events is append-only'; end if; if coalesce(current_setting('eds.audit_purge', true), '') <> 'on' then raise exception 'audit_events rows can only be removed by an authorized purge'; end if; return old; end $$;
drop trigger if exists audit_events_guard on audit_events;
create trigger audit_events_guard before update or delete on audit_events for each row execute function eds_audit_events_guard();
create or replace function eds_audit_records_guard() returns trigger language plpgsql as $$ begin if tg_op = 'UPDATE' then raise exception 'audit_records is append-only'; end if; if coalesce(current_setting('eds.retention_purge', true), '') <> 'on' or old.retain_until > now() then raise exception 'audit_records rows are kept until retain_until'; end if; return old; end $$;
drop trigger if exists audit_records_guard on audit_records;
create trigger audit_records_guard before update or delete on audit_records for each row execute function eds_audit_records_guard();

-- Email delivery evidence (Resend message ids -> document/signer) and webhook de-duplication.
create table if not exists email_messages (
  message_id text primary key,
  document_id uuid,
  signer_id uuid,
  email text,
  kind text not null,
  delivered_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists email_messages_doc_idx on email_messages (document_id);
alter table email_messages enable row level security;
create table if not exists webhook_events_seen (
  id text primary key,
  created_at timestamptz not null default now()
);
alter table webhook_events_seen enable row level security;

-- Two-factor authentication (TOTP, RFC 6238). Secrets are sealed with AES-256-GCM by the app.
alter table profiles add column if not exists totp_secret text;
alter table profiles add column if not exists totp_pending text;
alter table profiles add column if not exists totp_enabled_at timestamptz;
alter table profiles add column if not exists totp_last_step bigint;
alter table profiles add column if not exists totp_recovery jsonb;

-- Real-visitor analytics: random per-browser visitor id, salted IP hash (never the raw IP), internal flag.
alter table funnel_events add column if not exists vid text;
alter table funnel_events add column if not exists ip_hash text;
alter table funnel_events add column if not exists internal boolean not null default false;
create index if not exists funnel_events_vid_idx on funnel_events (vid);
create table if not exists funnel_excluded_ips (
  ip_hash text primary key,
  label text,
  created_at timestamptz not null default now()
);
alter table funnel_excluded_ips enable row level security;

-- Row-level security on the developer and team tables (the server role owns them and bypasses RLS).
alter table api_keys enable row level security;
alter table webhooks enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invites enable row level security;
