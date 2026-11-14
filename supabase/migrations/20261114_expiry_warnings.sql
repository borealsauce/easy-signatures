-- Unsigned signers and the sender get an email 2 days before a signing link expires.
alter table documents add column if not exists expiry_warned_at timestamptz;
