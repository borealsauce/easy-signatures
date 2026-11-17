-- 2026-11-16: evidence (hash chain, append-only triggers, retention), email delivery events, TOTP.
-- Apply in the Supabase SQL editor as the postgres role, then run the ownership block at the end.

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

-- Production: the app connects as eds_app, which must own app tables.
alter table audit_records owner to eds_app;
alter sequence audit_records_id_seq owner to eds_app;
alter table email_messages owner to eds_app;
alter table webhook_events_seen owner to eds_app;
alter function eds_audit_events_guard() owner to eds_app;
alter function eds_audit_records_guard() owner to eds_app;
