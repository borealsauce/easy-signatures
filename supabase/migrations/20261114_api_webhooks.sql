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
