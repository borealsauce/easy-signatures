-- Run once in the Supabase SQL editor after schema.sql.
-- The API uses the database password / service role and bypasses these policies.
-- The anon and authenticated keys cannot read or write product data directly.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter table profiles enable row level security;
alter table entitlements enable row level security;
alter table documents enable row level security;
alter table signers enable row level security;
alter table audit_events enable row level security;
alter table signing_links enable row level security;
alter table payments enable row level security;
alter table card_fingerprints enable row level security;
alter table free_phone_claims enable row level security;
alter table free_email_claims enable row level security;
alter table free_device_claims enable row level security;
alter table free_ip_claims enable row level security;
alter table signup_attempts enable row level security;
alter table phone_otps enable row level security;
alter table stripe_events enable row level security;
alter table rate_limits enable row level security;
alter table promo_codes enable row level security;
alter table promo_redemptions enable row level security;
alter table support_messages enable row level security;
alter table error_log enable row level security;
alter table funnel_events enable row level security;

-- Storage: create a private bucket named "documents" in the Supabase dashboard
-- (Storage → New bucket → name: documents → Public: off).
-- Do not add a public policy. The server uploads with the service role key.

-- 2026-11-16: developer/team tables and retention/evidence tables. Policies are read-only and owner-scoped;
-- anon/authenticated still have no table grants, so these are defense in depth.
alter table api_keys enable row level security;
alter table webhooks enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invites enable row level security;
alter table audit_records enable row level security;
alter table email_messages enable row level security;
alter table webhook_events_seen enable row level security;
alter table funnel_excluded_ips enable row level security;
create policy api_keys_owner_read on api_keys for select to authenticated using (user_id = auth.uid());
create policy webhooks_owner_read on webhooks for select to authenticated using (user_id = auth.uid());
create policy team_members_self_read on team_members for select to authenticated using (user_id = auth.uid());
create policy teams_member_read on teams for select to authenticated using (created_by = auth.uid() or exists (select 1 from team_members m where m.team_id = teams.id and m.user_id = auth.uid()));
create policy team_invites_inviter_read on team_invites for select to authenticated using (invited_by = auth.uid());
