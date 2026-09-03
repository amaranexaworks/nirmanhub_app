-- SEED 006 — Materials categories + a starter catalog.
SET search_path TO nirmaan, public;

INSERT INTO nirmaan.mtrl_ctgry_lst_t (ctgry_cd, ctgry_nm, icn_tx, sqnce_id) VALUES
  ('cement_agg',   'Cement & Aggregates', 'cube-outline',        1),
  ('steel',        'Steel',               'barbell-outline',     2),
  ('bricks_block', 'Bricks & Blocks',     'grid-outline',        3),
  ('plumbing',     'Plumbing',            'water-outline',       4),
  ('electrical',   'Electrical',          'flash-outline',       5),
  ('paint_finish', 'Paint & Finish',      'color-fill-outline',  6),
  ('tools',        'Tools',               'construct-outline',   7),
  ('safety',       'Safety',              'shield-outline',      8),
  ('other',        'Other',               'ellipsis-horizontal-outline', 9)
ON CONFLICT (ctgry_cd) DO UPDATE SET ctgry_nm = EXCLUDED.ctgry_nm, icn_tx = EXCLUDED.icn_tx, sqnce_id = EXCLUDED.sqnce_id;

INSERT INTO nirmaan.mtrl_item_lst_t (nm_tx, emoji_tx, ctgry_id, price_am, unit_tx, eta_min, poplr_in, vndr_usr_id)
SELECT v.nm_tx, v.emoji_tx, c.ctgry_id, v.price_am, v.unit_tx, v.eta_min, v.poplr_in,
       -- first material_supplier user (test users seeded in 004)
       (SELECT u.usr_id FROM nirmaan.usr_lst_t u
          JOIN nirmaan.usr_rle_rel_t ur ON ur.usr_id = u.usr_id
          JOIN nirmaan.rle_lst_t r ON r.rle_id = ur.rle_id
         WHERE r.rle_cd = 'material_supplier' ORDER BY u.usr_id LIMIT 1)
FROM (VALUES
  ('OPC 53 Grade Cement', '🪨', 'cement_agg',   420, 'per bag',    90, 1),
  ('PPC Cement',          '🪨', 'cement_agg',   390, 'per bag',    90, 0),
  ('River Sand',          '⏳', 'cement_agg',  1800, 'per ton',   180, 1),
  ('20mm Aggregate',      '🪨', 'cement_agg',  1200, 'per ton',   180, 0),
  ('TMT Bar 8mm',         '🔩', 'steel',         65, 'per kg',    240, 1),
  ('TMT Bar 12mm',        '🔩', 'steel',         64, 'per kg',    240, 1),
  ('Red Bricks',          '🧱', 'bricks_block',   9, 'per piece', 240, 1),
  ('AAC Block',           '⬜', 'bricks_block',  55, 'per piece', 240, 0),
  ('CPVC Pipe 1in',       '🚰', 'plumbing',     240, 'per length', 60, 0),
  ('PVC Elbow',           '🔧', 'plumbing',      18, 'per piece',  60, 0),
  ('Wire 2.5sqmm',        '⚡', 'electrical',   1450, 'per roll',   60, 1),
  ('Modular Switch',      '🔌', 'electrical',    85, 'per piece',  60, 0),
  ('Emulsion Paint 20L',  '🎨', 'paint_finish', 3200, 'per bucket',120, 1),
  ('Primer 10L',          '🖌️', 'paint_finish', 1400, 'per bucket',120, 0),
  ('Trowel',              '🛠️', 'tools',         180, 'per piece',  60, 0),
  ('Safety Helmet',       '⛑️', 'safety',        150, 'per piece',  60, 1)
) AS v(nm_tx, emoji_tx, ctgry_cd, price_am, unit_tx, eta_min, poplr_in)
JOIN nirmaan.mtrl_ctgry_lst_t c ON c.ctgry_cd = v.ctgry_cd
ON CONFLICT DO NOTHING;
