-- ════════════════════════════════════════════════════════════════════════
-- SEED 004 — Service types (catalog) + TEST USERS: exactly 2 per role.
-- ════════════════════════════════════════════════════════════════════════
-- No dummy/demo data: every user here maps to a real role so the whole app can
-- be exercised from any persona. Phone scheme = 10 digits (fits the app's login
-- field), all log in with dev OTP 1234:
--   9 | rle_id(3) | n(1) | 00000    e.g. role 42 user 1 -> 9 042 1 00000 = 9042100000
SET search_path TO nirmaan, public;

-- ── Service types (marketplace requirement categories) ──────────────────────
INSERT INTO nirmaan.srvc_type_lst_t (srvc_type_cd, srvc_type_nm, icn_tx, price_hint_tx, sqnce_id) VALUES
  ('build_house',  'Build a House',      'home-outline',        '₹1,500–2,200 / sqft', 1),
  ('renovation',   'Renovation',         'hammer-outline',      '₹400–900 / sqft',     2),
  ('interior',     'Interior',           'bed-outline',         '₹800–1,800 / sqft',   3),
  ('painting',     'Painting',           'color-fill-outline',  '₹18–40 / sqft',       4),
  ('plumbing',     'Plumbing',           'water-outline',       '₹350–600 / point',    5),
  ('electrical',   'Electrical',         'flash-outline',       '₹300–550 / point',    6),
  ('tiling',       'Tiling',             'grid-outline',        '₹90–160 / sqft',      7),
  ('waterproofing','Waterproofing',      'umbrella-outline',    '₹35–80 / sqft',       8),
  ('borewell',     'Borewell',           'ellipse-outline',     '₹80–120 / ft',        9),
  ('daily_labour', 'Daily Labour',       'people-outline',      '₹550–900 / day',      10),
  ('consult',      'Consultation',       'ribbon-outline',      'Varies',              11),
  ('materials',    'Materials',          'cube-outline',        'Market rate',         12),
  ('equipment',    'Equipment',          'construct-outline',   'Rental',              13),
  ('finance',      'Finance',            'cash-outline',        'As per lender',       14),
  ('other',        'Other',              'ellipsis-horizontal-outline', NULL,          15)
ON CONFLICT (srvc_type_cd) DO UPDATE
  SET srvc_type_nm = EXCLUDED.srvc_type_nm, icn_tx = EXCLUDED.icn_tx,
      price_hint_tx = EXCLUDED.price_hint_tx, sqnce_id = EXCLUDED.sqnce_id;

-- ── Purge any legacy demo users (and their cascade-owned data) ───────────────
DELETE FROM nirmaan.usr_lst_t WHERE mbl_nm IN
  ('919000000001','919000000002','919000000003','919000000004',
   '919000000005','919000000006','919000000009');

-- ── Generate 2 users per role ───────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  n INT;
  uid BIGINT;
  phone TEXT;
  cities TEXT[]  := ARRAY['Hyderabad','Bengaluru','Chennai','Mumbai','Pune','Vijayawada'];
  tiers  TEXT[]  := ARRAY['none','basic','verified'];
  is_pro BOOLEAN;
BEGIN
  FOR r IN
    SELECT rl.rle_id, rl.rle_nm, a.archtyp_cd
    FROM nirmaan.rle_lst_t rl
    JOIN nirmaan.archtyp_lst_t a ON a.archtyp_id = rl.archtyp_id
    WHERE rl.a_in = 1
    ORDER BY rl.rle_id
  LOOP
    is_pro := r.archtyp_cd IN ('worker','expert');
    FOR n IN 1..2 LOOP
      phone := '9' || lpad(r.rle_id::text, 3, '0') || n::text || '00000';
      INSERT INTO nirmaan.usr_lst_t
        (mbl_nm, dsply_nm, fst_nm, cty_nm, pncd_tx, kyc_tier_cd, rtng_nm, rtng_cnt,
         day_rate_am, srvc_rds_km, hdln_tx, actv_rle_id)
      VALUES (
        phone,
        r.rle_nm || CASE n WHEN 1 THEN ' One' ELSE ' Two' END,
        split_part(r.rle_nm, ' ', 1),
        cities[1 + ((r.rle_id + n) % 6)],
        '5000' || lpad(((r.rle_id * 7 + n) % 99)::text, 2, '0'),
        tiers[1 + ((r.rle_id + n) % 3)],
        round((3.5 + ((r.rle_id % 15)::numeric) / 10)::numeric, 2),
        10 + r.rle_id + n,
        CASE WHEN is_pro THEN 600 + (r.rle_id % 10) * 50 ELSE NULL END,
        CASE WHEN is_pro THEN 10 + (r.rle_id % 20) ELSE NULL END,
        r.rle_nm || ' on Nirmaan',
        r.rle_id
      )
      ON CONFLICT (mbl_nm) DO NOTHING
      RETURNING usr_id INTO uid;

      IF uid IS NOT NULL THEN
        INSERT INTO nirmaan.usr_rle_rel_t (usr_id, rle_id, prmry_in)
        VALUES (uid, r.rle_id, 1) ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ── Department memberships (so the org/departments feature has test data) ────
-- Map a few role users into departments with a designation.
INSERT INTO nirmaan.usr_dprtmnt_rel_t (usr_id, dprtmnt_id, dsgntn_id, prmry_in)
SELECT u.usr_id, d.dprtmnt_id, dg.dsgntn_id, 1
FROM nirmaan.usr_lst_t u
JOIN nirmaan.usr_rle_rel_t ur ON ur.usr_id = u.usr_id
JOIN nirmaan.rle_lst_t rl ON rl.rle_id = ur.rle_id
JOIN (VALUES
  ('project_manager',  'OPS',   'ops_head'),
  ('site_supervisor',  'OPS',   'ops_exec'),
  ('contractor',       'SALES', 'sales_mgr'),
  ('real_estate_agent','SALES', 'sales_exec'),
  ('material_supplier','CATLG', 'catalog_mgr'),
  ('loan_agent',       'FIN',   'fin_analyst'),
  ('banker',           'FIN',   'fin_mgr'),
  ('architect',        'TECH',  'eng_lead')
) AS m(rle_cd, dprtmnt_cd, dsgntn_cd) ON m.rle_cd = rl.rle_cd
JOIN nirmaan.dprtmnt_lst_t d  ON d.dprtmnt_cd  = m.dprtmnt_cd
JOIN nirmaan.dsgntn_lst_t  dg ON dg.dsgntn_cd  = m.dsgntn_cd
ON CONFLICT (usr_id, dprtmnt_id) DO NOTHING;
