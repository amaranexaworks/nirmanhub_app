-- 050 — Product depth for the catalog: sub-types, brands, colour/finish variants,
-- and per-item specifications + features. Mirrors a real e-commerce PDP hierarchy:
--   Category → Sub-type (e.g. Ceiling Fans) → Brand (Havells…) → Item → Variant (colour)
-- plus a specs/features sheet on the item. Idempotent (ON CONFLICT).
SET search_path TO nirmaan, public;

-- ── Item gains a sub-type + brand (both optional; NULL ⇒ that level is skipped) ──
ALTER TABLE nirmaan.mtrl_item_lst_t ADD COLUMN IF NOT EXISTS sub_ctgry_tx VARCHAR(80);
ALTER TABLE nirmaan.mtrl_item_lst_t ADD COLUMN IF NOT EXISTS brnd_tx      VARCHAR(80);
CREATE INDEX IF NOT EXISTS idx_mtrl_item_subctgry ON nirmaan.mtrl_item_lst_t (ctgry_id, sub_ctgry_tx);
CREATE INDEX IF NOT EXISTS idx_mtrl_item_brand    ON nirmaan.mtrl_item_lst_t (ctgry_id, brnd_tx);

-- ── Colour / finish variants for an item ──
CREATE TABLE IF NOT EXISTS nirmaan.mtrl_item_variant_t (
  variant_id BIGSERIAL PRIMARY KEY,
  item_id    BIGINT NOT NULL REFERENCES nirmaan.mtrl_item_lst_t(item_id) ON DELETE CASCADE,
  clr_nm     VARCHAR(60) NOT NULL,
  clr_hex    VARCHAR(9),
  price_am   NUMERIC(12,2),          -- NULL ⇒ use the item's base price
  img_url_tx TEXT,
  sku_tx     VARCHAR(60),
  sqnce_id   INT NOT NULL DEFAULT 0,
  a_in       SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (item_id, clr_nm)
);
CREATE INDEX IF NOT EXISTS idx_mtrl_variant_item ON nirmaan.mtrl_item_variant_t (item_id);

-- ── Specifications + features (one row each; spec_typ_cd = 'spec' | 'feature') ──
CREATE TABLE IF NOT EXISTS nirmaan.mtrl_item_spec_t (
  spec_id     BIGSERIAL PRIMARY KEY,
  item_id     BIGINT NOT NULL REFERENCES nirmaan.mtrl_item_lst_t(item_id) ON DELETE CASCADE,
  spec_typ_cd VARCHAR(12) NOT NULL DEFAULT 'spec',
  k_tx        VARCHAR(80) NOT NULL,   -- label (spec) or the feature text (feature)
  v_tx        VARCHAR(200),           -- value (spec); NULL for a feature
  sqnce_id    INT NOT NULL DEFAULT 0,
  a_in        SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (item_id, spec_typ_cd, k_tx)
);
CREATE INDEX IF NOT EXISTS idx_mtrl_spec_item ON nirmaan.mtrl_item_spec_t (item_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED — a fully worked example: Fans & Ventilation (sub-types → brands → items
-- → colours + specs), plus brands/specs on a few flagship items in other categories.
-- ─────────────────────────────────────────────────────────────────────────────

-- Fan items across sub-types & brands (upsert; also backfills sub-type/brand on re-run).
INSERT INTO nirmaan.mtrl_item_lst_t (nm_tx, emoji_tx, ctgry_id, price_am, unit_tx, eta_min, poplr_in, sub_ctgry_tx, brnd_tx)
SELECT v.nm_tx, v.emoji_tx, c.ctgry_id, v.price_am, v.unit_tx, v.eta_min, v.poplr_in, v.sub_ctgry_tx, v.brnd_tx
FROM (VALUES
  -- Ceiling Fans
  ('Havells Leganza Ceiling Fan 1200mm',  '🌀', 2450, 'per piece', 120, 1, 'Ceiling Fans', 'Havells'),
  ('Crompton Aura Ceiling Fan 1200mm',    '🌀', 2200, 'per piece', 120, 0, 'Ceiling Fans', 'Crompton'),
  ('Orient Electric Ceiling Fan 1200mm',  '🌀', 2050, 'per piece', 120, 0, 'Ceiling Fans', 'Orient'),
  ('Atomberg Renesa BLDC Fan 1200mm',     '🌀', 3599, 'per piece', 120, 1, 'Ceiling Fans', 'Atomberg'),
  ('Bajaj Frore Ceiling Fan 1200mm',      '🌀', 1899, 'per piece', 120, 0, 'Ceiling Fans', 'Bajaj'),
  -- Table Fans
  ('Bajaj Esteem Table Fan 400mm',        '🌬️', 1650, 'per piece', 120, 0, 'Table Fans',   'Bajaj'),
  ('Crompton Hiflo Table Fan 400mm',      '🌬️', 1499, 'per piece', 120, 0, 'Table Fans',   'Crompton'),
  -- Exhaust Fans
  ('Havells Ventilair Exhaust Fan 150mm', '💨', 1250, 'per piece', 120, 0, 'Exhaust Fans', 'Havells'),
  ('Luminous Vento Exhaust Fan 150mm',    '💨',  980, 'per piece', 120, 0, 'Exhaust Fans', 'Luminous'),
  -- Wall Fans
  ('Orient Wall-49 Wall Fan 400mm',       '🪭', 1799, 'per piece', 120, 0, 'Wall Fans',    'Orient')
) AS v(nm_tx, emoji_tx, price_am, unit_tx, eta_min, poplr_in, sub_ctgry_tx, brnd_tx)
CROSS JOIN LATERAL (SELECT ctgry_id FROM nirmaan.mtrl_ctgry_lst_t WHERE ctgry_cd = 'fans') c
ON CONFLICT (nm_tx) DO UPDATE
  SET price_am = EXCLUDED.price_am, unit_tx = EXCLUDED.unit_tx, emoji_tx = EXCLUDED.emoji_tx,
      poplr_in = EXCLUDED.poplr_in, sub_ctgry_tx = EXCLUDED.sub_ctgry_tx, brnd_tx = EXCLUDED.brnd_tx, a_in = 1;

-- Backfill the two original starter fans into the new taxonomy.
UPDATE nirmaan.mtrl_item_lst_t SET sub_ctgry_tx = 'Ceiling Fans', brnd_tx = 'Generic' WHERE nm_tx = 'Ceiling Fan 1200mm';
UPDATE nirmaan.mtrl_item_lst_t SET sub_ctgry_tx = 'Exhaust Fans', brnd_tx = 'Generic' WHERE nm_tx = 'Exhaust Fan 6in';

-- Brands on a few flagship items in other categories (so the brand level appears there too).
UPDATE nirmaan.mtrl_item_lst_t SET brnd_tx = 'UltraTech'  WHERE nm_tx = 'OPC 53 Grade Cement';
UPDATE nirmaan.mtrl_item_lst_t SET brnd_tx = 'ACC'        WHERE nm_tx = 'PPC Cement';
UPDATE nirmaan.mtrl_item_lst_t SET brnd_tx = 'JSW'        WHERE nm_tx IN ('TMT Bar 12mm','TMT Bar 16mm');

-- Colour / finish variants (idempotent). Joined to items by name.
INSERT INTO nirmaan.mtrl_item_variant_t (item_id, clr_nm, clr_hex, price_am, sqnce_id)
SELECT i.item_id, v.clr_nm, v.clr_hex, v.price_am, v.sqnce_id
FROM (VALUES
  ('Havells Leganza Ceiling Fan 1200mm', 'Brown',       '#6b4a2b', NULL::numeric, 1),
  ('Havells Leganza Ceiling Fan 1200mm', 'Ivory',       '#efe6d0', NULL, 2),
  ('Havells Leganza Ceiling Fan 1200mm', 'Bronze Gold', '#8a6d3b', 2550, 3),
  ('Crompton Aura Ceiling Fan 1200mm',   'White',       '#f4f4f2', NULL, 1),
  ('Crompton Aura Ceiling Fan 1200mm',   'Brown',       '#6b4a2b', NULL, 2),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Matte Black', '#23241f', NULL, 1),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Pearl White', '#eceae4', NULL, 2),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Sand',        '#d9c9a3', 3699, 3),
  ('Orient Electric Ceiling Fan 1200mm', 'Brown',       '#6b4a2b', NULL, 1),
  ('Orient Electric Ceiling Fan 1200mm', 'White',       '#f4f4f2', NULL, 2),
  ('Bajaj Esteem Table Fan 400mm',       'Blue',        '#2f5fae', NULL, 1),
  ('Bajaj Esteem Table Fan 400mm',       'Grey',        '#8b8f95', NULL, 2)
) AS v(nm_tx, clr_nm, clr_hex, price_am, sqnce_id)
JOIN nirmaan.mtrl_item_lst_t i ON i.nm_tx = v.nm_tx
ON CONFLICT (item_id, clr_nm) DO UPDATE
  SET clr_hex = EXCLUDED.clr_hex, price_am = EXCLUDED.price_am, sqnce_id = EXCLUDED.sqnce_id, a_in = 1;

-- Specifications (spec_typ_cd = 'spec').
INSERT INTO nirmaan.mtrl_item_spec_t (item_id, spec_typ_cd, k_tx, v_tx, sqnce_id)
SELECT i.item_id, 'spec', v.k_tx, v.v_tx, v.sqnce_id
FROM (VALUES
  ('Havells Leganza Ceiling Fan 1200mm', 'Sweep',      '1200 mm',        1),
  ('Havells Leganza Ceiling Fan 1200mm', 'Speed',      '380 RPM',        2),
  ('Havells Leganza Ceiling Fan 1200mm', 'Power',      '72 W',           3),
  ('Havells Leganza Ceiling Fan 1200mm', 'Air Delivery','230 CMM',       4),
  ('Havells Leganza Ceiling Fan 1200mm', 'Blades',     '3',              5),
  ('Havells Leganza Ceiling Fan 1200mm', 'Warranty',   '2 years',        6),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Sweep',      '1200 mm',        1),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Motor',      'BLDC (energy saving)', 2),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Power',      '28 W',           3),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Speed',      '350 RPM',        4),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Remote',     'Included',       5),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Warranty',   '2 + 1 years',    6),
  ('OPC 53 Grade Cement',                'Grade',      'OPC 53',         1),
  ('OPC 53 Grade Cement',                'Pack Size',  '50 kg bag',      2),
  ('OPC 53 Grade Cement',                'Strength',   '53 MPa (28 day)',3),
  ('OPC 53 Grade Cement',                'Standard',   'IS 12269',       4)
) AS v(nm_tx, k_tx, v_tx, sqnce_id)
JOIN nirmaan.mtrl_item_lst_t i ON i.nm_tx = v.nm_tx
ON CONFLICT (item_id, spec_typ_cd, k_tx) DO UPDATE
  SET v_tx = EXCLUDED.v_tx, sqnce_id = EXCLUDED.sqnce_id, a_in = 1;

-- Features (spec_typ_cd = 'feature'; k_tx holds the feature text, v_tx NULL).
INSERT INTO nirmaan.mtrl_item_spec_t (item_id, spec_typ_cd, k_tx, v_tx, sqnce_id)
SELECT i.item_id, 'feature', v.k_tx, NULL, v.sqnce_id
FROM (VALUES
  ('Havells Leganza Ceiling Fan 1200mm', 'High air delivery',              1),
  ('Havells Leganza Ceiling Fan 1200mm', '100% copper motor',              2),
  ('Havells Leganza Ceiling Fan 1200mm', 'Rust-free powder coating',       3),
  ('Havells Leganza Ceiling Fan 1200mm', 'Dust-resistant finish',          4),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Saves up to 65% electricity',    1),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Runs on inverter during outages',2),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Remote with timer & sleep mode', 3),
  ('Atomberg Renesa BLDC Fan 1200mm',    'Silent operation',               4),
  ('OPC 53 Grade Cement',                'High early strength',            1),
  ('OPC 53 Grade Cement',                'Ideal for RCC & structural work', 2),
  ('OPC 53 Grade Cement',                'Consistent quality, IS certified',3)
) AS v(nm_tx, k_tx, sqnce_id)
JOIN nirmaan.mtrl_item_lst_t i ON i.nm_tx = v.nm_tx
ON CONFLICT (item_id, spec_typ_cd, k_tx) DO UPDATE
  SET sqnce_id = EXCLUDED.sqnce_id, a_in = 1;
