-- 048 — Add the "Catalog images" page to the DB-driven admin sidebar (Platform group,
-- right after Catalog) and gate it to the admin archetype, like the other admin items.
-- Renumbers the Platform group to keep the order tidy. Idempotent.
SET search_path TO nirmaan, public;

INSERT INTO nirmaan.mnu_itm_lst_t (mnu_itm_cd, mnu_itm_nm, icn_tx, url_tx, mnu_type_cd, sctn_nm, sqnce_id) VALUES
  ('adm_catalog',        'Catalog',           'pricetags-outline',        '/admin/catalog',         'admin', 'Platform', 20),
  ('adm_catalog_images', 'Catalog images',    'image-outline',            '/admin/catalog-images',  'admin', 'Platform', 21),
  ('adm_verification',   'Verification',      'shield-checkmark-outline', '/admin/verification',    'admin', 'Platform', 22),
  ('adm_menu',           'Menu / navigation', 'layers-outline',           '/admin/menu',            'admin', 'Platform', 23),
  ('adm_roles',          'Roles & access',    'key-outline',              '/admin/roles',           'admin', 'Platform', 24),
  ('adm_broadcast',      'Broadcast',         'megaphone-outline',        '/admin/broadcast',       'admin', 'Platform', 25),
  ('adm_audit',          'Audit log',         'receipt-outline',          '/admin/audit',           'admin', 'Platform', 26)
ON CONFLICT (mnu_itm_cd, mnu_type_cd) DO UPDATE
  SET mnu_itm_nm = EXCLUDED.mnu_itm_nm, icn_tx = EXCLUDED.icn_tx, url_tx = EXCLUDED.url_tx,
      sctn_nm = EXCLUDED.sctn_nm, sqnce_id = EXCLUDED.sqnce_id;

-- Show it to the admin archetype.
INSERT INTO nirmaan.mnu_itm_archtyp_rel_t (mnu_itm_id, archtyp_id)
SELECT m.mnu_itm_id, a.archtyp_id
FROM nirmaan.mnu_itm_lst_t m
JOIN nirmaan.archtyp_lst_t a ON a.archtyp_cd = 'admin'
WHERE m.mnu_type_cd = 'admin' AND m.mnu_itm_cd = 'adm_catalog_images'
ON CONFLICT (mnu_itm_id, archtyp_id) DO NOTHING;
