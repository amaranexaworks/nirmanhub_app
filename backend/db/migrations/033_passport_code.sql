-- 033 — Nirmaan Digital ID: a short, human-shareable 6-digit code per user that
-- backs the QR "worker passport" card. Anyone can scan the QR / type the code to
-- verify a worker's public profile, experience and rating without logging in.
SET search_path TO nirmaan, public;

ALTER TABLE nirmaan.usr_lst_t
  ADD COLUMN IF NOT EXISTS psprt_cd_tx CHAR(6);

-- Backfill existing users with a unique, deterministic 6-digit code.
UPDATE nirmaan.usr_lst_t
   SET psprt_cd_tx = LPAD((100000 + usr_id)::text, 6, '0')
 WHERE psprt_cd_tx IS NULL;

-- Enforce uniqueness (new codes are allocated with retry in the model).
CREATE UNIQUE INDEX IF NOT EXISTS idx_usr_psprt_cd
  ON nirmaan.usr_lst_t (psprt_cd_tx) WHERE psprt_cd_tx IS NOT NULL;
