-- 018 — Social/email sign-in support: auth provider column + email uniqueness.
-- Backs UserAuthMdl.createByEmailMdl / findByEmailMdl and the /auth/social route.
SET search_path TO nirmaan, public;

ALTER TABLE nirmaan.usr_lst_t
  ADD COLUMN IF NOT EXISTS auth_prvdr_cd VARCHAR(20) NOT NULL DEFAULT 'phone';  -- phone | google | apple | email

-- mbl_nm is NOT NULL by default; email-only users have no phone, so relax it.
ALTER TABLE nirmaan.usr_lst_t ALTER COLUMN mbl_nm DROP NOT NULL;

-- Prevent duplicate accounts per email (case-insensitive), ignoring NULLs.
CREATE UNIQUE INDEX IF NOT EXISTS uq_usr_email_ci
  ON nirmaan.usr_lst_t (lower(eml_tx)) WHERE eml_tx IS NOT NULL;
