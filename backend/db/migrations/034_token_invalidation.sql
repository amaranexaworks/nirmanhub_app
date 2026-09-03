-- 034 — Token invalidation stamp. When an admin deactivates a user or revokes a
-- capability, that change must take effect immediately — but a bearer JWT is valid
-- until it expires (up to 4h). `tkn_invld_bfr_ts` records "reject any token issued
-- before this instant" for a user. authenticate() compares the token's `iat` against
-- it and rejects stale tokens, so a deactivate / capability-revoke logs the user out
-- of every active session at once. NULL means no invalidation (the common case).
SET search_path TO nirmaan, public;

ALTER TABLE nirmaan.usr_lst_t
  ADD COLUMN IF NOT EXISTS tkn_invld_bfr_ts TIMESTAMPTZ;
