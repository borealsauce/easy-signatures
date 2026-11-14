alter table profiles add column if not exists favorite_fields jsonb not null default '["signature","initials"]'::jsonb;
