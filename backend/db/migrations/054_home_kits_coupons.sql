-- 054 — Home-page depth: curated project KITS (add-all material lists) and COUPONS.
-- Kits are DB-managed (list + items); coupons reuse the promo table (slot 'coupon').
SET search_path TO nirmaan, public;

-- ── Project kits ("Shop by project") ──
CREATE TABLE IF NOT EXISTS nirmaan.mtrl_kit_lst_t (
  kit_id     BIGSERIAL PRIMARY KEY,
  kit_cd     VARCHAR(40) UNIQUE NOT NULL,
  nm_tx      VARCHAR(100) NOT NULL,
  sub_tx     VARCHAR(160),
  tag_tx     VARCHAR(40),
  img_url_tx TEXT,
  sqnce_id   INT NOT NULL DEFAULT 0,
  a_in       SMALLINT NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS nirmaan.mtrl_kit_item_rel_t (
  kit_id   BIGINT NOT NULL REFERENCES nirmaan.mtrl_kit_lst_t(kit_id) ON DELETE CASCADE,
  item_id  BIGINT NOT NULL REFERENCES nirmaan.mtrl_item_lst_t(item_id) ON DELETE CASCADE,
  qty      INT NOT NULL DEFAULT 1,
  sqnce_id INT NOT NULL DEFAULT 0,
  PRIMARY KEY (kit_id, item_id)
);

INSERT INTO nirmaan.mtrl_kit_lst_t (kit_cd, nm_tx, sub_tx, tag_tx, img_url_tx, sqnce_id) VALUES
  ('elec_starter', 'Electrical Starter Kit', 'Wiring, switches & lighting for one room', 'Popular',
   'https://images.pexels.com/photos/38171184/pexels-photo-38171184.jpeg?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop', 1),
  ('bathroom', 'Bathroom Fit-out Kit', 'Sanitaryware, mixer, pipes & tiles', 'Value',
   'https://images.pexels.com/photos/30547730/pexels-photo-30547730.jpeg?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop', 2),
  ('site_starter', 'New Site Starter Kit', 'Cement, sand, aggregate & TMT to begin', 'Essential',
   'https://images.pexels.com/photos/29519165/pexels-photo-29519165.jpeg?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop', 3),
  ('painting', 'Painting Kit', 'Primer, emulsion & enamel for a full coat', 'Finishing',
   'https://images.pexels.com/photos/1887946/pexels-photo-1887946.jpeg?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop', 4)
ON CONFLICT (kit_cd) DO UPDATE SET nm_tx = EXCLUDED.nm_tx, sub_tx = EXCLUDED.sub_tx, tag_tx = EXCLUDED.tag_tx,
  img_url_tx = EXCLUDED.img_url_tx, sqnce_id = EXCLUDED.sqnce_id, a_in = 1;

INSERT INTO nirmaan.mtrl_kit_item_rel_t (kit_id, item_id, sqnce_id)
SELECT k.kit_id, i.item_id, v.sqnce_id
FROM (VALUES
  ('elec_starter', 'Wire 2.5sqmm', 1),
  ('elec_starter', 'FR Wire 1.5sqmm Coil', 2),
  ('elec_starter', 'Modular Switch', 3),
  ('elec_starter', '16A Power Socket', 4),
  ('elec_starter', 'LED Bulb 9W', 5),
  ('elec_starter', 'LED Panel Light 18W', 6),
  ('bathroom', 'Wall-Mounted WC', 1),
  ('bathroom', 'Ceramic Wash Basin', 2),
  ('bathroom', 'Single-Lever Basin Mixer', 3),
  ('bathroom', 'CPVC Pipe 1in', 4),
  ('bathroom', 'Anti-Skid Bathroom Tile', 5),
  ('site_starter', 'OPC 53 Grade Cement', 1),
  ('site_starter', 'River Sand', 2),
  ('site_starter', '20mm Aggregate', 3),
  ('site_starter', 'TMT Bar 12mm', 4),
  ('site_starter', 'Binding Wire', 5),
  ('painting', 'Primer 10L', 1),
  ('painting', 'Emulsion Paint 20L', 2),
  ('painting', 'Exterior Emulsion 20L', 3),
  ('painting', 'Wood Enamel Paint 4L', 4)
) AS v(kit_cd, nm_tx, sqnce_id)
JOIN nirmaan.mtrl_kit_lst_t k ON k.kit_cd = v.kit_cd
JOIN nirmaan.mtrl_item_lst_t i ON i.nm_tx = v.nm_tx
ON CONFLICT (kit_id, item_id) DO UPDATE SET sqnce_id = EXCLUDED.sqnce_id;

-- ── Coupons (reuse promo table, slot 'coupon'): tag=code, ttl=offer, sub=terms ──
INSERT INTO nirmaan.mtrl_promo_lst_t (slot_cd, tag_tx, ttl_tx, sub_tx, cta_tx, actn_cd, icn_tx, sqnce_id) VALUES
  ('coupon', 'SITE200',  '₹200 off',            'on orders above ₹5,000',  'Apply', 'login', 'receipt-outline', 1),
  ('coupon', 'FREESHIP', 'Free site delivery',  'on orders above ₹2,000',  'Apply', 'login', 'cube-outline',    2),
  ('coupon', 'BULK5',    '5% off bulk steel',   'minimum 1 tonne',         'Apply', 'login', 'barbell-outline', 3),
  ('coupon', 'NEW100',   'Flat ₹100 off',       'first order for new users','Apply', 'login', 'flash-outline',   4)
ON CONFLICT (slot_cd, ttl_tx) DO UPDATE SET tag_tx = EXCLUDED.tag_tx, sub_tx = EXCLUDED.sub_tx,
  cta_tx = EXCLUDED.cta_tx, actn_cd = EXCLUDED.actn_cd, icn_tx = EXCLUDED.icn_tx, sqnce_id = EXCLUDED.sqnce_id, a_in = 1;
