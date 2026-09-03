-- ════════════════════════════════════════════════════════════════════════
-- SEED 003 — Navigation: tabs + drawer  (replaces tabConfigs.ts + AppMenu.tsx)
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

-- ── Menu items: TABS ────────────────────────────────────────────────────────
INSERT INTO nirmaan.mnu_itm_lst_t (mnu_itm_cd, mnu_itm_nm, lbl_key_tx, icn_tx, url_tx, mnu_type_cd, emphss_in, sqnce_id) VALUES
  ('home',         'Home',      'tabs.home',         'home-outline',        '/app/home',         'tab', 0, 1),
  ('discover',     'Discover',  'tabs.discover',     'search-outline',      '/app/discover',     'tab', 0, 2),
  ('bookings',     'Bookings',  'tabs.bookings',     'calendar-outline',    '/app/bookings',     'tab', 0, 3),
  ('messages',     'Messages',  'tabs.messages',     'chatbubbles-outline', '/app/messages',     'tab', 0, 4),
  ('profile',      'Profile',   'tabs.profile',      'person-outline',      '/app/profile',      'tab', 0, 5),
  ('jobs',         'Jobs',      'tabs.jobs',         'briefcase-outline',   '/app/jobs',         'tab', 0, 6),
  ('availability', 'Available', 'tabs.availability', 'time-outline',        '/app/availability', 'tab', 0, 7),
  ('leads',        'Leads',     'tabs.leads',        'magnet-outline',      '/app/leads',        'tab', 0, 8),
  ('portfolio',    'Portfolio', 'tabs.portfolio',    'images-outline',      '/app/portfolio',    'tab', 0, 9),
  ('marketplace',  'Market',    'tabs.marketplace',  'storefront-outline',  '/app/marketplace',  'tab', 0, 10),
  ('create',       'Create',    'tabs.create',       'add-circle',          '/app/create',       'tab', 1, 11),
  ('sites',        'Sites',     'tabs.sites',        'business-outline',    '/app/sites',        'tab', 0, 12),
  ('catalog',      'Catalog',   'tabs.catalog',      'grid-outline',        '/app/catalog',      'tab', 0, 13),
  ('add',          'Add',       'tabs.add',          'add-circle',          '/app/add',          'tab', 1, 14),
  ('orders',       'Orders',    'tabs.orders',       'receipt-outline',     '/app/orders',       'tab', 0, 15),
  ('applications', 'Loans',     'tabs.applications', 'document-text-outline','/app/applications','tab', 0, 16),
  ('products',     'Products',  'tabs.products',     'pricetags-outline',   '/app/products',     'tab', 0, 17)
ON CONFLICT (mnu_itm_cd, mnu_type_cd) DO UPDATE
  SET mnu_itm_nm = EXCLUDED.mnu_itm_nm, lbl_key_tx = EXCLUDED.lbl_key_tx, icn_tx = EXCLUDED.icn_tx,
      url_tx = EXCLUDED.url_tx, emphss_in = EXCLUDED.emphss_in, sqnce_id = EXCLUDED.sqnce_id;

-- ── Menu items: DRAWER (side menu, GENERAL section) ─────────────────────────
INSERT INTO nirmaan.mnu_itm_lst_t (mnu_itm_cd, mnu_itm_nm, lbl_key_tx, icn_tx, url_tx, mnu_type_cd, sctn_nm, sqnce_id) VALUES
  ('workforce',     'Workforce Management', 'menu.workforce',     'people-outline',            '/app/workforce',     'drawer', 'GENERAL', 1),
  ('kyc',           'Verify Identity (KYC)','menu.kyc',           'shield-checkmark-outline',  '/app/kyc',           'drawer', 'GENERAL', 2),
  ('wallet',        'Wallet & Payments',    'menu.wallet',        'wallet-outline',            '/app/wallet',        'drawer', 'GENERAL', 3),
  ('notifications', 'Notifications',        'menu.notifications', 'notifications-outline',     '/app/notifications', 'drawer', 'GENERAL', 4),
  ('saved',         'Saved & Searches',     'menu.saved',         'bookmark-outline',          '/app/saved',         'drawer', 'GENERAL', 5),
  ('refer',         'Refer & Earn',         'menu.refer',         'gift-outline',              '/app/refer',         'drawer', 'GENERAL', 6),
  ('help',          'Help & Support',       'menu.help',          'help-circle-outline',       '/app/help',          'drawer', 'GENERAL', 7),
  ('settings',      'Settings',             'menu.settings',      'settings-outline',          '/app/settings',      'drawer', 'GENERAL', 8)
ON CONFLICT (mnu_itm_cd, mnu_type_cd) DO UPDATE
  SET mnu_itm_nm = EXCLUDED.mnu_itm_nm, lbl_key_tx = EXCLUDED.lbl_key_tx, icn_tx = EXCLUDED.icn_tx,
      url_tx = EXCLUDED.url_tx, sctn_nm = EXCLUDED.sctn_nm, sqnce_id = EXCLUDED.sqnce_id;

-- ── Archetype → Tab mapping (bottom tab bar per archetype; max 5, ordered) ──
-- lbl_ovrd_tx captures per-archetype label variants (financier "Loans"/"Chats").
INSERT INTO nirmaan.archtyp_mnu_itm_rel_t (archtyp_id, mnu_itm_id, lbl_ovrd_tx, sqnce_id)
SELECT a.archtyp_id, m.mnu_itm_id, v.lbl_ovrd_tx, v.sqnce_id
FROM (VALUES
  -- seeker
  ('seeker','home',NULL,1),('seeker','discover',NULL,2),('seeker','bookings',NULL,3),('seeker','messages',NULL,4),('seeker','profile',NULL,5),
  -- worker
  ('worker','home',NULL,1),('worker','jobs',NULL,2),('worker','availability',NULL,3),('worker','messages',NULL,4),('worker','profile',NULL,5),
  -- expert
  ('expert','home',NULL,1),('expert','leads',NULL,2),('expert','portfolio',NULL,3),('expert','messages',NULL,4),('expert','profile',NULL,5),
  -- orchestrator
  ('orchestrator','home',NULL,1),('orchestrator','marketplace',NULL,2),('orchestrator','create',NULL,3),('orchestrator','sites',NULL,4),('orchestrator','profile',NULL,5),
  -- vendor
  ('vendor','home',NULL,1),('vendor','catalog',NULL,2),('vendor','add',NULL,3),('vendor','orders',NULL,4),('vendor','profile',NULL,5),
  -- financier
  ('financier','home',NULL,1),('financier','applications','Loans',2),('financier','products',NULL,3),('financier','messages','Chats',4),('financier','profile',NULL,5)
) AS v(archtyp_cd, mnu_itm_cd, lbl_ovrd_tx, sqnce_id)
JOIN nirmaan.archtyp_lst_t a ON a.archtyp_cd = v.archtyp_cd
JOIN nirmaan.mnu_itm_lst_t m ON m.mnu_itm_cd = v.mnu_itm_cd AND m.mnu_type_cd = 'tab'
ON CONFLICT (archtyp_id, mnu_itm_id) DO UPDATE
  SET lbl_ovrd_tx = EXCLUDED.lbl_ovrd_tx, sqnce_id = EXCLUDED.sqnce_id;

-- ── Drawer gating: "Workforce Management" only for orchestrators ─────────────
-- (All other drawer items have no gating rows → visible to every user.)
INSERT INTO nirmaan.mnu_itm_archtyp_rel_t (mnu_itm_id, archtyp_id)
SELECT m.mnu_itm_id, a.archtyp_id
FROM nirmaan.mnu_itm_lst_t m
JOIN nirmaan.archtyp_lst_t a ON a.archtyp_cd = 'orchestrator'
WHERE m.mnu_itm_cd = 'workforce' AND m.mnu_type_cd = 'drawer'
ON CONFLICT (mnu_itm_id, archtyp_id) DO NOTHING;
