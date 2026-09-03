-- ════════════════════════════════════════════════════════════════════════
-- 018 — Social / email auth (Google, Apple, email sign-in)
-- Lets an account be created from an email identity instead of a phone number.
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

-- Phone is no longer mandatory: social/email accounts may have no phone yet.
-- (mbl_nm keeps its UNIQUE constraint; Postgres treats multiple NULLs as distinct.)
ALTER TABLE nirmaan.usr_lst_t ALTER COLUMN mbl_nm DROP NOT NULL;

-- Record how the account was created: phone | google | apple | email.
ALTER TABLE nirmaan.usr_lst_t
  ADD COLUMN IF NOT EXISTS auth_prvdr_cd VARCHAR(20) NOT NULL DEFAULT 'phone';

-- One active account per email (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS uq_usr_eml
  ON nirmaan.usr_lst_t (lower(eml_tx))
  WHERE eml_tx IS NOT NULL AND a_in = 1;
