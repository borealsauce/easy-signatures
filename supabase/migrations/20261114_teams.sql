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
