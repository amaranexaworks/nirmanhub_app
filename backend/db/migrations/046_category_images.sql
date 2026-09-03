-- 046 — Real photos for every material category so the storefront tiles show
-- actual images (not icons). Existing 9 keep their curated Unsplash shots (seed 010);
-- the new categories get keyword-matched real photos. These are a production stopgap —
-- replace with your own branded product images via the admin image tool when ready.
-- The frontend has an onError→icon fallback, so a missing image degrades gracefully.
SET search_path TO nirmaan, public;

UPDATE nirmaan.mtrl_ctgry_lst_t SET img_url_tx = v.url
FROM (VALUES
  ('rmc',               'https://loremflickr.com/400/400/concrete,mixer/all?lock=201'),
  ('tiling',            'https://loremflickr.com/400/400/floor,tiles/all?lock=202'),
  ('putty',             'https://loremflickr.com/400/400/wall,plaster/all?lock=203'),
  ('waterproofing',     'https://loremflickr.com/400/400/roof,waterproof/all?lock=204'),
  ('plywood',           'https://loremflickr.com/400/400/plywood,timber/all?lock=205'),
  ('laminates',         'https://loremflickr.com/400/400/wood,laminate/all?lock=206'),
  ('adhesives',         'https://loremflickr.com/400/400/glue,adhesive/all?lock=207'),
  ('false_ceiling',     'https://loremflickr.com/400/400/ceiling,gypsum/all?lock=208'),
  ('wallpaper',         'https://loremflickr.com/400/400/wallpaper/all?lock=209'),
  ('sanitaryware',      'https://loremflickr.com/400/400/bathroom,washbasin/all?lock=210'),
  ('wires',             'https://loremflickr.com/400/400/electrical,cable/all?lock=211'),
  ('switches',          'https://loremflickr.com/400/400/switch,socket/all?lock=212'),
  ('lighting',          'https://loremflickr.com/400/400/led,lamp/all?lock=213'),
  ('conduits',          'https://loremflickr.com/400/400/pvc,conduit/all?lock=214'),
  ('fans',              'https://loremflickr.com/400/400/ceiling,fan/all?lock=215'),
  ('water_mgmt',        'https://loremflickr.com/400/400/water,tank/all?lock=216'),
  ('doors_windows',     'https://loremflickr.com/400/400/door,window/all?lock=217'),
  ('locks_hardware',    'https://loremflickr.com/400/400/door,lock/all?lock=218'),
  ('hinges',            'https://loremflickr.com/400/400/hinge,hardware/all?lock=219'),
  ('glass',             'https://loremflickr.com/400/400/glass,mirror/all?lock=220'),
  ('fasteners',         'https://loremflickr.com/400/400/screws,bolts/all?lock=221'),
  ('kitchen_fittings',  'https://loremflickr.com/400/400/modular,kitchen/all?lock=222'),
  ('wardrobe_fittings', 'https://loremflickr.com/400/400/wardrobe,furniture/all?lock=223'),
  ('roofing',           'https://loremflickr.com/400/400/roof,sheet/all?lock=224'),
  ('power_tools',       'https://loremflickr.com/400/400/power,drill/all?lock=225')
) AS v(ctgry_cd, url)
WHERE nirmaan.mtrl_ctgry_lst_t.ctgry_cd = v.ctgry_cd;
