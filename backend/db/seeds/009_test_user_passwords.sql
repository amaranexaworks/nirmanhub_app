-- ════════════════════════════════════════════════════════════════════════
-- SEED 009 — Default password for test users so PHONE+PASSWORD login works.
-- Password = 'nirmaan123' for every seeded user that has no password yet.
-- (OTP login still works too; real users set their own password at signup.)
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

UPDATE nirmaan.usr_lst_t
SET pwd_tx = '$2b$10$emtyzs9wPth00itV/n.TY.ICSTZafEXWQFZ4kpa2f5bEg144Idc8i', auth_prvdr_cd = 'password'
WHERE pwd_tx IS NULL AND mbl_nm IS NOT NULL;
