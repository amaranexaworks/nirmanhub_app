-- 051 — Move storefront presentation content out of the frontend and into the DB:
-- marketing promos (hero + bottom ads), pack-size options, and product highlights.
-- Everything the guest storefront renders now comes from data, not constants.
SET search_path TO nirmaan, public;

-- ── Marketing banners: hero carousel (slot 'hero') + bottom ads (slot 'ad') ──
CREATE TABLE IF NOT EXISTS nirmaan.mtrl_promo_lst_t (
  promo_id   BIGSERIAL PRIMARY KEY,
  slot_cd    VARCHAR(12) NOT NULL DEFAULT 'hero',  -- 'hero' | 'ad'
  tag_tx     VARCHAR(40),
  ttl_tx     VARCHAR(160) NOT NULL,
  sub_tx     VARCHAR(200),
  cta_tx     VARCHAR(40),
  actn_cd    VARCHAR(24),                           -- 'materials'|'workers'|'jobs'|'login'
  icn_tx     VARCHAR(40),                           -- ionicon name for the tag chip
  bg_tx      TEXT,                                  -- CSS background (gradient)
  fg_tx      VARCHAR(12),                           -- text colour
  cta_fg_tx  VARCHAR(12),                           -- CTA text colour
  img_url_tx TEXT,
  sqnce_id   INT NOT NULL DEFAULT 0,
  a_in       SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (slot_cd, ttl_tx)
);
CREATE INDEX IF NOT EXISTS idx_mtrl_promo_slot ON nirmaan.mtrl_promo_lst_t (slot_cd, sqnce_id);

-- ── Pack-size options ('*' ctgry_cd = applies to every category) ──
CREATE TABLE IF NOT EXISTS nirmaan.mtrl_pack_lst_t (
  pack_id   BIGSERIAL PRIMARY KEY,
  ctgry_cd  VARCHAR(40) NOT NULL DEFAULT '*',
  mult_qty  INT NOT NULL,
  label_tx  VARCHAR(40),
  sqnce_id  INT NOT NULL DEFAULT 0,
  a_in      SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (ctgry_cd, mult_qty)
);

-- ── Product highlights / trade assurances (global, shown on every detail page) ──
CREATE TABLE IF NOT EXISTS nirmaan.mtrl_highlight_lst_t (
  hl_id     BIGSERIAL PRIMARY KEY,
  icn_tx    VARCHAR(40) NOT NULL,
  label_tx  VARCHAR(60) NOT NULL,
  sqnce_id  INT NOT NULL DEFAULT 0,
  a_in      SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (label_tx)
);

-- ── Seed: hero carousel ──
INSERT INTO nirmaan.mtrl_promo_lst_t (slot_cd, tag_tx, ttl_tx, sub_tx, cta_tx, actn_cd, icn_tx, bg_tx, fg_tx, cta_fg_tx, sqnce_id) VALUES
  ('hero', 'Materials', 'Build materials at trade prices', 'Cement, steel, bricks — delivered to your site', 'Shop now', 'materials', 'cube-outline',
   'linear-gradient(135deg, #ffd98a 0%, #f5b301 100%)', '#3a2a00', '#8a5a00', 1),
  ('hero', 'Workforce', 'Hire verified workers near you', 'Masons, electricians, plumbers & more', 'Find workers', 'workers', 'construct-outline',
   'linear-gradient(135deg, #7aa0d9 0%, #4f6fae 100%)', '#ffffff', '#2f4a86', 2),
  ('hero', 'Work', 'Find construction jobs today', 'Apply to openings across India', 'Browse jobs', 'jobs', 'flash-outline',
   'linear-gradient(135deg, #5cc0a8 0%, #2fa587 100%)', '#ffffff', '#1f7a63', 3)
ON CONFLICT (slot_cd, ttl_tx) DO UPDATE SET
  tag_tx = EXCLUDED.tag_tx, sub_tx = EXCLUDED.sub_tx, cta_tx = EXCLUDED.cta_tx, actn_cd = EXCLUDED.actn_cd,
  icn_tx = EXCLUDED.icn_tx, bg_tx = EXCLUDED.bg_tx, fg_tx = EXCLUDED.fg_tx, cta_fg_tx = EXCLUDED.cta_fg_tx, sqnce_id = EXCLUDED.sqnce_id, a_in = 1;

-- ── Seed: bottom ads ──
INSERT INTO nirmaan.mtrl_promo_lst_t (slot_cd, tag_tx, ttl_tx, sub_tx, cta_tx, actn_cd, bg_tx, fg_tx, cta_fg_tx, sqnce_id) VALUES
  ('ad', 'Sponsored', 'Trade rates on bulk cement & steel', 'Extra savings on site orders above ₹50,000', 'Shop deals', 'login',
   'linear-gradient(135deg, #ffd98a 0%, #f5b301 100%)', '#3a2a00', '#8a5a00', 1),
  ('ad', 'Offer', 'Refer a builder, earn ₹500', 'Credited to your wallet on their first order', 'Invite now', 'login',
   'linear-gradient(135deg, #7aa0d9 0%, #4f6fae 100%)', '#ffffff', '#2f4a86', 2)
ON CONFLICT (slot_cd, ttl_tx) DO UPDATE SET
  tag_tx = EXCLUDED.tag_tx, sub_tx = EXCLUDED.sub_tx, cta_tx = EXCLUDED.cta_tx, actn_cd = EXCLUDED.actn_cd,
  bg_tx = EXCLUDED.bg_tx, fg_tx = EXCLUDED.fg_tx, cta_fg_tx = EXCLUDED.cta_fg_tx, sqnce_id = EXCLUDED.sqnce_id, a_in = 1;

-- ── Seed: global pack sizes ──
INSERT INTO nirmaan.mtrl_pack_lst_t (ctgry_cd, mult_qty, sqnce_id) VALUES
  ('*', 1, 1), ('*', 5, 2), ('*', 10, 3), ('*', 50, 4)
ON CONFLICT (ctgry_cd, mult_qty) DO UPDATE SET sqnce_id = EXCLUDED.sqnce_id, a_in = 1;

-- ── Seed: product highlights ──
INSERT INTO nirmaan.mtrl_highlight_lst_t (icn_tx, label_tx, sqnce_id) VALUES
  ('receipt-outline',  'GST invoice',        1),
  ('shield-outline',   'Quality checked',    2),
  ('flash-outline',    'Fast site delivery', 3)
ON CONFLICT (label_tx) DO UPDATE SET icn_tx = EXCLUDED.icn_tx, sqnce_id = EXCLUDED.sqnce_id, a_in = 1;
