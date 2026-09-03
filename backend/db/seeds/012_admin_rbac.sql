-- ════════════════════════════════════════════════════════════════════════
-- SEED 012 — ADMIN RBAC: the platform-operator persona.
--   • a 7th archetype  'admin'          (never shown in customer onboarding)
--   • a role           'platform_admin' (under the admin archetype)
--   • admin capabilities + grants        (gate the admin console + APIs)
--   • one login-ready admin user         (phone 9999900000 / nirmaan123)
-- Idempotent: safe to re-run. Mirrors the ON CONFLICT style of seed 001.
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

-- ── Archetype ───────────────────────────────────────────────────────────────
INSERT INTO nirmaan.archtyp_lst_t (archtyp_cd, archtyp_nm, dscn_tx, icn_tx, sqnce_id) VALUES
  ('admin', 'Administrator', 'Platform operators who manage the entire application', 'shield-checkmark-outline', 99)
ON CONFLICT (archtyp_cd) DO UPDATE
  SET archtyp_nm = EXCLUDED.archtyp_nm, dscn_tx = EXCLUDED.dscn_tx,
      icn_tx = EXCLUDED.icn_tx, sqnce_id = EXCLUDED.sqnce_id;

-- ── Role ────────────────────────────────────────────────────────────────────
INSERT INTO nirmaan.rle_lst_t (rle_cd, rle_nm, archtyp_id, emoji_tx, sqnce_id)
SELECT 'platform_admin', 'Platform Admin', a.archtyp_id, '🛡️', 1
FROM nirmaan.archtyp_lst_t a WHERE a.archtyp_cd = 'admin'
ON CONFLICT (rle_cd) DO UPDATE
  SET rle_nm = EXCLUDED.rle_nm, archtyp_id = EXCLUDED.archtyp_id,
      emoji_tx = EXCLUDED.emoji_tx, sqnce_id = EXCLUDED.sqnce_id;

-- ── Capabilities (fine-grained so partial-admins are possible later) ─────────
INSERT INTO nirmaan.cpblty_lst_t (cpblty_cd, cpblty_nm, dscn_tx) VALUES
  ('admin_access',    'Admin Console',        'Enter the admin console'),
  ('manage_users',    'Manage Users',         'View, activate/deactivate users and assign roles'),
  ('verify_kyc',      'Verify KYC',           'Review KYC, run verification slots, approve/reject'),
  ('moderate_content','Moderate Content',     'Moderate jobs, requirements, materials and bookings'),
  ('oversee_finance', 'Oversee Finance',      'Oversee loans, wallets, wages and billing'),
  ('view_analytics',  'View Analytics',       'View platform-wide analytics'),
  ('broadcast',       'Broadcast',            'Send platform-wide notifications')
ON CONFLICT (cpblty_cd) DO UPDATE SET cpblty_nm = EXCLUDED.cpblty_nm, dscn_tx = EXCLUDED.dscn_tx;

-- ── Grant every admin capability to the admin archetype ─────────────────────
INSERT INTO nirmaan.archtyp_cpblty_rel_t (archtyp_id, cpblty_id)
SELECT a.archtyp_id, c.cpblty_id
FROM nirmaan.archtyp_lst_t a
JOIN nirmaan.cpblty_lst_t  c ON c.cpblty_cd IN
  ('admin_access','manage_users','verify_kyc','moderate_content',
   'oversee_finance','view_analytics','broadcast','browse_marketplace')
WHERE a.archtyp_cd = 'admin'
ON CONFLICT (archtyp_id, cpblty_id) DO NOTHING;

-- ── The default admin login (phone 9999900000 / password 'nirmaan123') ──────
-- Password hash is the same bcrypt('nirmaan123') used by seed 009.
INSERT INTO nirmaan.usr_lst_t
  (mbl_nm, dsply_nm, fst_nm, pwd_tx, auth_prvdr_cd, kyc_tier_cd, actv_rle_id)
SELECT '9999900000', 'Platform Admin', 'Admin',
       '$2b$10$emtyzs9wPth00itV/n.TY.ICSTZafEXWQFZ4kpa2f5bEg144Idc8i', 'password',
       'verified', r.rle_id
FROM nirmaan.rle_lst_t r WHERE r.rle_cd = 'platform_admin'
ON CONFLICT (mbl_nm) DO UPDATE
  SET pwd_tx = EXCLUDED.pwd_tx, auth_prvdr_cd = 'password',
      actv_rle_id = EXCLUDED.actv_rle_id, u_ts = now();

-- Link the admin user ↔ platform_admin role (primary).
INSERT INTO nirmaan.usr_rle_rel_t (usr_id, rle_id, prmry_in)
SELECT u.usr_id, r.rle_id, 1
FROM nirmaan.usr_lst_t u, nirmaan.rle_lst_t r
WHERE u.mbl_nm = '9999900000' AND r.rle_cd = 'platform_admin'
ON CONFLICT (usr_id, rle_id) DO UPDATE SET a_in = 1, prmry_in = 1;
