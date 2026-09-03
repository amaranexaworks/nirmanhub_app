-- ════════════════════════════════════════════════════════════════════════
-- SEED 002 — Departments & Designations (internal org structure / staff logins)
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

INSERT INTO nirmaan.dprtmnt_lst_t (dprtmnt_cd, dprtmnt_nm, dscn_tx, sqnce_id) VALUES
  ('OPS',   'Operations',            'Marketplace operations and fulfilment',      1),
  ('SALES', 'Sales & Onboarding',    'Vendor/pro onboarding and sales',            2),
  ('CATLG', 'Catalog & Vendor Mgmt', 'Materials catalog and vendor management',    3),
  ('FIN',   'Finance & Payments',    'Wages, payouts, settlements and lending ops', 4),
  ('KYC',   'KYC & Compliance',      'Identity verification and compliance',       5),
  ('SUP',   'Customer Support',      'Support and grievance handling',             6),
  ('MKTG',  'Marketing & Growth',    'Growth, referrals and communications',       7),
  ('TECH',  'Technology',            'Engineering and platform',                   8)
ON CONFLICT (dprtmnt_cd) DO UPDATE
  SET dprtmnt_nm = EXCLUDED.dprtmnt_nm, dscn_tx = EXCLUDED.dscn_tx, sqnce_id = EXCLUDED.sqnce_id;

INSERT INTO nirmaan.dsgntn_lst_t (dsgntn_cd, dsgntn_nm, dprtmnt_id, sqnce_id)
SELECT v.dsgntn_cd, v.dsgntn_nm, d.dprtmnt_id, v.sqnce_id
FROM (VALUES
  ('ops_head',    'Operations Head',      'OPS',   1),
  ('ops_exec',    'Operations Executive', 'OPS',   2),
  ('sales_mgr',   'Sales Manager',        'SALES', 1),
  ('sales_exec',  'Sales Executive',      'SALES', 2),
  ('catalog_mgr', 'Catalog Manager',      'CATLG', 1),
  ('fin_mgr',     'Finance Manager',      'FIN',   1),
  ('fin_analyst', 'Finance Analyst',      'FIN',   2),
  ('kyc_officer', 'KYC Officer',          'KYC',   1),
  ('sup_lead',    'Support Lead',         'SUP',   1),
  ('sup_agent',   'Support Agent',        'SUP',   2),
  ('mktg_mgr',    'Marketing Manager',    'MKTG',  1),
  ('eng_lead',    'Engineering Lead',     'TECH',  1),
  ('sw_eng',      'Software Engineer',    'TECH',  2)
) AS v(dsgntn_cd, dsgntn_nm, dprtmnt_cd, sqnce_id)
JOIN nirmaan.dprtmnt_lst_t d ON d.dprtmnt_cd = v.dprtmnt_cd
ON CONFLICT (dsgntn_cd) DO UPDATE
  SET dsgntn_nm = EXCLUDED.dsgntn_nm, dprtmnt_id = EXCLUDED.dprtmnt_id, sqnce_id = EXCLUDED.sqnce_id;
