-- Clickwrap: record when and which version of the Terms each account accepted at signup.
alter table profiles add column if not exists terms_accepted_at timestamptz;
alter table profiles add column if not exists terms_version text;
alter table profiles add column if not exists terms_accepted_ip text;
