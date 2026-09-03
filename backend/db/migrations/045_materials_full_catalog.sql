-- 045 — Comprehensive house-construction catalog. Expands the 9 starter categories
-- into a full Indian construction-materials taxonomy (tiles, plywood, sanitaryware,
-- doors & hardware, kitchen/wardrobe fittings, wires, switches, lighting, waterproofing,
-- roofing, power tools …) grouped into sections, each with real starter products.
-- Idempotent (ON CONFLICT). Category images stay icon-driven until real photos are set.
SET search_path TO nirmaan, public;

-- ── Categories (existing upserted with section + order; new ones added) ──
INSERT INTO nirmaan.mtrl_ctgry_lst_t (ctgry_cd, ctgry_nm, icn_tx, sqnce_id, sctn_nm) VALUES
  -- Civil & Structure
  ('cement_agg',        'Cement & Aggregates',          'cube-outline',            1,  'Civil & Structure'),
  ('steel',             'Steel & TMT',                  'barbell-outline',         2,  'Civil & Structure'),
  ('bricks_block',      'Bricks & Blocks',              'grid-outline',            3,  'Civil & Structure'),
  ('rmc',               'Ready-Mix Concrete',           'cube-outline',            4,  'Civil & Structure'),
  -- Finishes & Interiors
  ('tiling',            'Tiles & Flooring',             'grid-outline',            10, 'Finishes & Interiors'),
  ('paint_finish',      'Paint & Finish',               'color-fill-outline',      11, 'Finishes & Interiors'),
  ('putty',             'Putty & Wall Care',            'brush-outline',           12, 'Finishes & Interiors'),
  ('waterproofing',     'Waterproofing',                'umbrella-outline',        13, 'Finishes & Interiors'),
  ('plywood',           'Plywood, MDF & Boards',        'layers-outline',          14, 'Finishes & Interiors'),
  ('laminates',         'Laminates & Veneers',          'albums-outline',          15, 'Finishes & Interiors'),
  ('adhesives',         'Adhesives & Sealants',         'flask-outline',           16, 'Finishes & Interiors'),
  ('false_ceiling',     'False Ceiling & Gypsum',       'apps-outline',            17, 'Finishes & Interiors'),
  ('wallpaper',         'Wallpaper',                    'image-outline',           18, 'Finishes & Interiors'),
  -- Plumbing & Electrical
  ('plumbing',          'Plumbing & Pipes',             'water-outline',           30, 'Plumbing & Electrical'),
  ('sanitaryware',      'Sanitaryware & Bath Fittings', 'water-outline',           31, 'Plumbing & Electrical'),
  ('electrical',        'Electrical',                   'flash-outline',           32, 'Plumbing & Electrical'),
  ('wires',             'Wires & Cables',               'flash-outline',           33, 'Plumbing & Electrical'),
  ('switches',          'Switches & Sockets',           'toggle-outline',          34, 'Plumbing & Electrical'),
  ('lighting',          'Lighting',                     'bulb-outline',            35, 'Plumbing & Electrical'),
  ('conduits',          'Conduits & Fittings',          'git-network-outline',     36, 'Plumbing & Electrical'),
  ('fans',              'Fans & Ventilation',           'aperture-outline',        37, 'Plumbing & Electrical'),
  ('water_mgmt',        'Water Tanks & Pumps',          'water-outline',           38, 'Plumbing & Electrical'),
  -- Doors, Windows & Hardware
  ('doors_windows',     'Doors & Windows',              'browsers-outline',        50, 'Doors, Windows & Hardware'),
  ('locks_hardware',    'Door Locks & Hardware',        'lock-closed-outline',     51, 'Doors, Windows & Hardware'),
  ('hinges',            'Hinges, Channels & Handles',   'build-outline',           52, 'Doors, Windows & Hardware'),
  ('glass',             'Glass & Mirrors',              'square-outline',          53, 'Doors, Windows & Hardware'),
  ('fasteners',         'Fasteners & Screws',           'build-outline',           54, 'Doors, Windows & Hardware'),
  -- Kitchen & Wardrobe
  ('kitchen_fittings',  'Kitchen Systems & Accessories','restaurant-outline',      70, 'Kitchen & Wardrobe'),
  ('wardrobe_fittings', 'Wardrobe & Bed Fittings',      'bed-outline',             71, 'Kitchen & Wardrobe'),
  -- Roofing & Exterior
  ('roofing',           'Roofing & Sheets',             'home-outline',            80, 'Roofing & Exterior'),
  -- Tools & Safety
  ('tools',             'Tools',                        'construct-outline',       90, 'Tools & Safety'),
  ('power_tools',       'Power Tools',                  'construct-outline',       91, 'Tools & Safety'),
  ('safety',            'Safety Gear',                  'shield-outline',          92, 'Tools & Safety'),
  -- Other
  ('other',             'Other',                        'ellipsis-horizontal-outline', 100, 'Other Materials')
ON CONFLICT (ctgry_cd) DO UPDATE
  SET ctgry_nm = EXCLUDED.ctgry_nm, icn_tx = EXCLUDED.icn_tx, sqnce_id = EXCLUDED.sqnce_id, sctn_nm = EXCLUDED.sctn_nm;

-- ── Products (each joined to its category; unique by name → ON CONFLICT skip) ──
INSERT INTO nirmaan.mtrl_item_lst_t (nm_tx, emoji_tx, ctgry_id, price_am, unit_tx, eta_min, poplr_in, vndr_usr_id)
SELECT v.nm_tx, v.emoji_tx, c.ctgry_id, v.price_am, v.unit_tx, v.eta_min, v.poplr_in,
       (SELECT u.usr_id FROM nirmaan.usr_lst_t u
          JOIN nirmaan.usr_rle_rel_t ur ON ur.usr_id = u.usr_id
          JOIN nirmaan.rle_lst_t r ON r.rle_id = ur.rle_id
         WHERE r.rle_cd = 'material_supplier' ORDER BY u.usr_id LIMIT 1)
FROM (VALUES
  -- Civil & Structure (fill out existing + rmc)
  ('M-Sand',                     '⏳', 'cement_agg',       1600, 'per ton',    180, 0),
  ('White Cement 25kg',          '⚪', 'cement_agg',        680, 'per bag',    120, 0),
  ('TMT Bar 16mm',               '🔩', 'steel',              63, 'per kg',     240, 0),
  ('Binding Wire',               '🔩', 'steel',              75, 'per kg',     120, 0),
  ('Fly Ash Brick',              '🧱', 'bricks_block',        8, 'per piece',  240, 0),
  ('Concrete Solid Block 8in',   '⬜', 'bricks_block',       48, 'per piece',  240, 0),
  ('M20 Ready-Mix Concrete',     '🧱', 'rmc',              4800, 'per m³',     240, 1),
  ('M25 Ready-Mix Concrete',     '🧱', 'rmc',              5200, 'per m³',     240, 0),
  -- Finishes & Interiors
  ('Vitrified Floor Tile 600x600','⬜', 'tiling',             48, 'per sqft',   180, 1),
  ('Ceramic Wall Tile 300x600',  '🟦', 'tiling',             36, 'per sqft',   180, 0),
  ('Anti-Skid Bathroom Tile',    '🟫', 'tiling',             42, 'per sqft',   180, 0),
  ('Exterior Emulsion 20L',      '🎨', 'paint_finish',     3800, 'per bucket', 120, 0),
  ('Wood Enamel Paint 4L',       '🖌️', 'paint_finish',      980, 'per can',    120, 0),
  ('Wall Putty 40kg',            '🪣', 'putty',            1150, 'per bag',    120, 1),
  ('POP Powder 25kg',            '⚪', 'putty',             420, 'per bag',    120, 0),
  ('Waterproof Coating 20kg',    '💧', 'waterproofing',    3600, 'per bucket', 120, 1),
  ('Bitumen Membrane Roll',      '🩹', 'waterproofing',    2400, 'per roll',   180, 0),
  ('BWP Plywood 18mm 8x4',       '🪵', 'plywood',          2600, 'per sheet',  180, 1),
  ('MDF Board 16mm 8x4',         '🪵', 'plywood',          1400, 'per sheet',  180, 0),
  ('HDHMR Board 18mm',           '🪵', 'plywood',          3100, 'per sheet',  180, 0),
  ('Laminate Sheet 1mm',         '🟤', 'laminates',        1250, 'per sheet',  180, 0),
  ('Teak Veneer Sheet',          '🟤', 'laminates',        3200, 'per sheet',  180, 0),
  ('Fevicol SH 5kg',             '🧴', 'adhesives',         720, 'per can',     60, 1),
  ('Tile Adhesive 20kg',         '🪣', 'adhesives',         380, 'per bag',    120, 0),
  ('Silicone Sealant',           '🧪', 'adhesives',         280, 'per tube',    60, 0),
  ('Gypsum Board 12mm 8x4',      '⬜', 'false_ceiling',      680, 'per sheet',  180, 0),
  ('POP Ceiling Channel',        '➖', 'false_ceiling',       95, 'per length', 120, 0),
  ('Vinyl Wallpaper Roll',       '🖼️', 'wallpaper',        1800, 'per roll',   180, 0),
  -- Plumbing & Electrical
  ('CPVC Pipe 0.75in',           '🚰', 'plumbing',          180, 'per length',  60, 0),
  ('Ball Valve 1in',             '🔧', 'plumbing',          220, 'per piece',   60, 0),
  ('Wall-Mounted WC',            '🚽', 'sanitaryware',     7800, 'per piece',  120, 1),
  ('Ceramic Wash Basin',         '🚰', 'sanitaryware',     2400, 'per piece',  120, 0),
  ('Single-Lever Basin Mixer',   '🚿', 'sanitaryware',     1900, 'per piece',  120, 0),
  ('FR Wire 1.5sqmm Coil',       '⚡', 'wires',            1350, 'per roll',    60, 1),
  ('FR Wire 4sqmm Coil',         '⚡', 'wires',            2900, 'per roll',    60, 0),
  ('Modular Switch Plate 8M',    '🔲', 'switches',          420, 'per piece',   60, 0),
  ('16A Power Socket',           '🔌', 'switches',          180, 'per piece',   60, 0),
  ('LED Panel Light 18W',        '💡', 'lighting',          420, 'per piece',   60, 1),
  ('LED Bulb 9W',                '💡', 'lighting',           95, 'per piece',   60, 0),
  ('COB Spot Light 7W',          '💡', 'lighting',          280, 'per piece',   60, 0),
  ('PVC Conduit Pipe 25mm',      '⚙️', 'conduits',           65, 'per length',  60, 0),
  ('Junction Box 4x4',           '⬛', 'conduits',           45, 'per piece',   60, 0),
  ('Ceiling Fan 1200mm',         '🌀', 'fans',             1650, 'per piece',  120, 1),
  ('Exhaust Fan 6in',            '🌀', 'fans',              780, 'per piece',  120, 0),
  ('Water Tank 1000L',           '🛢️', 'water_mgmt',       6800, 'per piece',  240, 1),
  ('Submersible Pump 1HP',       '⚙️', 'water_mgmt',       7200, 'per piece',  240, 0),
  -- Doors, Windows & Hardware
  ('Flush Door 32mm',            '🚪', 'doors_windows',    3200, 'per piece',  180, 1),
  ('UPVC Window 4x4',            '🪟', 'doors_windows',    8500, 'per piece',  240, 0),
  ('Mortise Door Lock Set',      '🔐', 'locks_hardware',   1450, 'per set',     60, 1),
  ('Digital Smart Lock',         '🔐', 'locks_hardware',   9800, 'per piece',  120, 0),
  ('SS Butt Hinge 4in',          '🔩', 'hinges',            120, 'per pair',    60, 0),
  ('Telescopic Drawer Channel',  '🔩', 'hinges',            280, 'per pair',    60, 0),
  ('Cabinet Handle 128mm',       '🔩', 'hinges',             95, 'per piece',   60, 0),
  ('Toughened Glass 12mm',       '🪟', 'glass',             180, 'per sqft',   180, 0),
  ('Bathroom Mirror 18x24',      '🪞', 'glass',             650, 'per piece',  120, 0),
  ('Wood Screws Box (200)',      '🔩', 'fasteners',         180, 'per box',     60, 0),
  ('Wall Anchor Bolts (100)',    '🔩', 'fasteners',         220, 'per box',     60, 0),
  -- Kitchen & Wardrobe
  ('SS Kitchen Pull-Out Basket', '🍽️', 'kitchen_fittings', 2400, 'per set',    120, 1),
  ('Soft-Close Cabinet Hinge',   '🔩', 'kitchen_fittings',  110, 'per piece',   60, 0),
  ('Granite Kitchen Sink Double','🚰', 'kitchen_fittings', 5600, 'per piece',  120, 0),
  ('Wardrobe Sliding Channel Set','🚪','wardrobe_fittings', 1800, 'per set',    120, 0),
  ('Hydraulic Bed Fitting',      '🛏️', 'wardrobe_fittings',2200, 'per pair',   120, 0),
  -- Roofing & Exterior
  ('Galvanized Roofing Sheet',   '🏠', 'roofing',           420, 'per sqm',    180, 1),
  ('Polycarbonate Sheet',        '🏠', 'roofing',           380, 'per sqft',   180, 0),
  -- Tools & Safety
  ('Measuring Tape 5m',          '📏', 'tools',             120, 'per piece',   60, 0),
  ('Spirit Level 24in',          '📐', 'tools',             350, 'per piece',   60, 0),
  ('Cordless Drill Machine',     '🔩', 'power_tools',      3800, 'per piece',  120, 1),
  ('Angle Grinder 4in',          '⚙️', 'power_tools',      2600, 'per piece',  120, 0),
  ('Concrete Vibrator',          '⚙️', 'power_tools',      8500, 'per piece',  180, 0),
  ('Safety Gloves',              '🧤', 'safety',             85, 'per pair',    60, 0),
  ('Safety Shoes',               '🥾', 'safety',            890, 'per pair',   120, 0),
  ('Reflective Jacket',          '🦺', 'safety',            180, 'per piece',   60, 0)
) AS v(nm_tx, emoji_tx, ctgry_cd, price_am, unit_tx, eta_min, poplr_in)
JOIN nirmaan.mtrl_ctgry_lst_t c ON c.ctgry_cd = v.ctgry_cd
ON CONFLICT (nm_tx) DO NOTHING;
