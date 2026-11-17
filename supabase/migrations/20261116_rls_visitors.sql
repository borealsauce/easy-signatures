-- 2026-11-16: RLS on api_keys, webhooks, teams, team_members, team_invites (owner-scoped read policies for the
-- Supabase "authenticated" role; the app's server role eds_app owns the tables and bypasses RLS), plus real-visitor analytics.
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
alter table funnel_excluded_ips owner to eds_app;

alter table api_keys enable row level security;
alter table webhooks enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invites enable row level security;

drop policy if exists api_keys_owner_read on api_keys;
create policy api_keys_owner_read on api_keys for select to authenticated using (user_id = auth.uid());
drop policy if exists webhooks_owner_read on webhooks;
create policy webhooks_owner_read on webhooks for select to authenticated using (user_id = auth.uid());
drop policy if exists team_members_self_read on team_members;
create policy team_members_self_read on team_members for select to authenticated using (user_id = auth.uid());
drop policy if exists teams_member_read on teams;
create policy teams_member_read on teams for select to authenticated using (created_by = auth.uid() or exists (select 1 from team_members m where m.team_id = teams.id and m.user_id = auth.uid()));
drop policy if exists team_invites_inviter_read on team_invites;
create policy team_invites_inviter_read on team_invites for select to authenticated using (invited_by = auth.uid());

-- Applied in production as eds_team_dev_owner_20261116: the app role must own these
-- tables so it keeps full access (owner bypasses RLS; FORCE is not set).
alter table api_keys owner to eds_app;
alter table webhooks owner to eds_app;
alter table teams owner to eds_app;
alter table team_members owner to eds_app;
alter table team_invites owner to eds_app;
