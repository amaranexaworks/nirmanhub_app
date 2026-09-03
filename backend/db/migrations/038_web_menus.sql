-- 038 — Web menus, DB-driven. Adds two new menu TYPES to mnu_itm_lst_t so the website's
-- sidebars come from the DB (like the app's tabs/drawer already do):
--   'workspace' — the member workspace sidebar (/app/*)
--   'admin'     — the admin console sidebar (/admin/*)
-- Visibility is per ARCHETYPE via mnu_itm_archtyp_rel_t (a gating row = "this archetype
-- may see it"; NO rows = visible to everyone). So an admin can assign which archetype
-- sees which menu. Site-operations menus are gated to the builder/contractor
-- (orchestrator) + admin; admin menus are gated to admin only; the rest are global.
-- icn_tx here holds the WEB icon name (workspace) or the ionicon name (admin), since
-- these types are web-only and never read by the mobile app.
SET search_path TO nirmaan, public;

-- ── Workspace sidebar items (icn_tx = web <Icon> name) ──────────────────────
INSERT INTO nirmaan.mnu_itm_lst_t (mnu_itm_cd, mnu_itm_nm, icn_tx, url_tx, mnu_type_cd, sctn_nm, sqnce_id) VALUES
  ('ws_overview',     'Overview',           'grid',     '/app',              'workspace', 'Workspace',       1),
  ('ws_id',           'My Nirmaan ID',      'id',       '/app/id',           'workspace', 'Workspace',       2),
  ('ws_jobs',         'Jobs',               'briefcase','/app/jobs',         'workspace', 'Marketplace',     10),
  ('ws_requirements', 'Requirements',       'clipboard','/app/requirements', 'workspace', 'Marketplace',     11),
  ('ws_materials',    'Materials',          'package',  '/app/materials',    'workspace', 'Marketplace',     12),
  ('ws_equipment',    'Equipment',          'truck',    '/app/equipment',    'workspace', 'Marketplace',     13),
  ('ws_orders',       'My orders',          'clipboard','/app/orders',       'workspace', 'Marketplace',     14),
  ('ws_bookings',     'Bookings',           'calendar', '/app/bookings',     'workspace', 'Marketplace',     15),
  ('ws_saved',        'Saved',              'heart',    '/app/saved',        'workspace', 'Marketplace',     16),
  ('ws_sites',        'Sites & Workforce',  'hardhat',  '/app/sites',        'workspace', 'Site operations', 20),
  ('ws_attendance',   'Attendance',         'check',    '/app/attendance',   'workspace', 'Site operations', 21),
  ('ws_cashbook',     'Cashbook',           'wallet',   '/app/cashbook',     'workspace', 'Site operations', 22),
  ('ws_flats',        'Flats & Sales',      'package',  '/app/flats',        'workspace', 'Site operations', 23),
  ('ws_documents',    'Documents',          'clipboard','/app/documents',    'workspace', 'Site operations', 24),
  ('ws_finance',      'Project finance',    'rupee',    '/app/finance',      'workspace', 'Site operations', 25),
  ('ws_wages',        'Payroll',            'rupee',    '/app/wages',        'workspace', 'Site operations', 26),
  ('ws_wallet',       'Wallet',             'wallet',   '/app/wallet',       'workspace', 'Site operations', 27),
  ('ws_messages',     'Messages',           'chat',     '/app/messages',     'workspace', 'Account',         30),
  ('ws_notifications','Notifications',      'bell',     '/app/notifications','workspace', 'Account',         31),
  ('ws_profile',      'Profile',            'user',     '/app/profile',      'workspace', 'Account',         32)
ON CONFLICT (mnu_itm_cd, mnu_type_cd) DO UPDATE
  SET mnu_itm_nm = EXCLUDED.mnu_itm_nm, icn_tx = EXCLUDED.icn_tx, url_tx = EXCLUDED.url_tx,
      sctn_nm = EXCLUDED.sctn_nm, sqnce_id = EXCLUDED.sqnce_id, a_in = 1;

-- ── Admin console sidebar items (icn_tx = ionicon name) ─────────────────────
INSERT INTO nirmaan.mnu_itm_lst_t (mnu_itm_cd, mnu_itm_nm, icn_tx, url_tx, mnu_type_cd, sctn_nm, sqnce_id) VALUES
  ('adm_dashboard',   'Dashboard',        'grid-outline',              '/admin',             'admin', 'Overview', 1),
  ('adm_users',       'Users',            'people-outline',            '/admin/users',       'admin', 'Manage',   10),
  ('adm_kyc',         'KYC verification', 'shield-checkmark-outline',  '/admin/kyc',         'admin', 'Manage',   11),
  ('adm_content',     'Content',          'layers-outline',            '/admin/content',     'admin', 'Manage',   12),
  ('adm_projects',    'Projects',         'business-outline',          '/admin/projects',    'admin', 'Manage',   13),
  ('adm_finance',     'Finance',          'cash-outline',              '/admin/finance',     'admin', 'Manage',   14),
  ('adm_messaging',   'Messaging',        'chatbubbles-outline',       '/admin/messaging',   'admin', 'Manage',   15),
  ('adm_catalog',     'Catalog',          'pricetags-outline',         '/admin/catalog',     'admin', 'Platform', 20),
  ('adm_verification','Verification',     'shield-checkmark-outline',  '/admin/verification','admin', 'Platform', 21),
  ('adm_menu',        'Menu / navigation','layers-outline',            '/admin/menu',        'admin', 'Platform', 22),
  ('adm_roles',       'Roles & access',   'key-outline',               '/admin/roles',       'admin', 'Platform', 23),
  ('adm_broadcast',   'Broadcast',        'megaphone-outline',         '/admin/broadcast',   'admin', 'Platform', 24),
  ('adm_audit',       'Audit log',        'receipt-outline',           '/admin/audit',       'admin', 'Platform', 25)
ON CONFLICT (mnu_itm_cd, mnu_type_cd) DO UPDATE
  SET mnu_itm_nm = EXCLUDED.mnu_itm_nm, icn_tx = EXCLUDED.icn_tx, url_tx = EXCLUDED.url_tx,
      sctn_nm = EXCLUDED.sctn_nm, sqnce_id = EXCLUDED.sqnce_id, a_in = 1;

-- ── Gating: which archetype sees which menu (empty rows for an item = everyone) ──
-- Admin items → admin archetype only.
INSERT INTO nirmaan.mnu_itm_archtyp_rel_t (mnu_itm_id, archtyp_id)
SELECT m.mnu_itm_id, a.archtyp_id
FROM nirmaan.mnu_itm_lst_t m
JOIN nirmaan.archtyp_lst_t a ON a.archtyp_cd = 'admin'
WHERE m.mnu_type_cd = 'admin'
ON CONFLICT (mnu_itm_id, archtyp_id) DO NOTHING;

-- Workspace "Site operations" → builder/contractor (orchestrator) + admin only.
INSERT INTO nirmaan.mnu_itm_archtyp_rel_t (mnu_itm_id, archtyp_id)
SELECT m.mnu_itm_id, a.archtyp_id
FROM nirmaan.mnu_itm_lst_t m
JOIN nirmaan.archtyp_lst_t a ON a.archtyp_cd IN ('orchestrator', 'admin')
WHERE m.mnu_type_cd = 'workspace' AND m.sctn_nm = 'Site operations'
ON CONFLICT (mnu_itm_id, archtyp_id) DO NOTHING;
-- (Workspace / Marketplace / Account items have no gating rows → visible to everyone.)
