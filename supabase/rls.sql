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

-- Storage: create a private bucket named "documents" in the Supabase dashboard
-- (Storage → New bucket → name: documents → Public: off).
-- Do not add a public policy. The server uploads with the service role key.
