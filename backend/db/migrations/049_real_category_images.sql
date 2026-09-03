-- 049 — REAL, relevant category photos for the whole catalog. Replaces the earlier
-- mismatched/stopgap images (a castle on Cement, flour on Paint, icons elsewhere) with
-- curated Pexels photos (free for commercial use, fast CDN, verified to load). Products
-- inherit their category photo via COALESCE. Owners can still override any of these with
-- their own branded shots via the admin "Catalog images" tool.
SET search_path TO nirmaan, public;

UPDATE nirmaan.mtrl_ctgry_lst_t SET img_url_tx = v.url
FROM (VALUES
  ('cement_agg',        'https://images.pexels.com/photos/29519165/pexels-photo-29519165.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('steel',             'https://images.pexels.com/photos/5623179/pexels-photo-5623179.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('bricks_block',      'https://images.pexels.com/photos/15500197/pexels-photo-15500197.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('rmc',               'https://images.pexels.com/photos/37121348/pexels-photo-37121348.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('tiling',            'https://images.pexels.com/photos/32021732/pexels-photo-32021732.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('paint_finish',      'https://images.pexels.com/photos/1887946/pexels-photo-1887946.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('putty',             'https://images.pexels.com/photos/38561969/pexels-photo-38561969.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('waterproofing',     'https://images.pexels.com/photos/38781389/pexels-photo-38781389.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('plywood',           'https://images.pexels.com/photos/5089122/pexels-photo-5089122.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('laminates',         'https://images.pexels.com/photos/5812/kitchen-boards-laminated-tabac.jpg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('adhesives',         'https://images.pexels.com/photos/3787100/pexels-photo-3787100.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('false_ceiling',     'https://images.pexels.com/photos/37982071/pexels-photo-37982071.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('wallpaper',         'https://images.pexels.com/photos/9099741/pexels-photo-9099741.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('plumbing',          'https://images.pexels.com/photos/29301874/pexels-photo-29301874.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('sanitaryware',      'https://images.pexels.com/photos/30547730/pexels-photo-30547730.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('electrical',        'https://images.pexels.com/photos/38171184/pexels-photo-38171184.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('wires',             'https://images.pexels.com/photos/18082922/pexels-photo-18082922.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('switches',          'https://images.pexels.com/photos/7111164/pexels-photo-7111164.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('lighting',          'https://images.pexels.com/photos/3946250/pexels-photo-3946250.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('conduits',          'https://images.pexels.com/photos/14129563/pexels-photo-14129563.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('fans',              'https://images.pexels.com/photos/38697833/pexels-photo-38697833.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('water_mgmt',        'https://images.pexels.com/photos/32418620/pexels-photo-32418620.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('doors_windows',     'https://images.pexels.com/photos/10608219/pexels-photo-10608219.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('locks_hardware',    'https://images.pexels.com/photos/279810/pexels-photo-279810.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('hinges',            'https://images.pexels.com/photos/35287566/pexels-photo-35287566.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('glass',             'https://images.pexels.com/photos/6980656/pexels-photo-6980656.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('fasteners',         'https://images.pexels.com/photos/21050460/pexels-photo-21050460.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('kitchen_fittings',  'https://images.pexels.com/photos/3926542/pexels-photo-3926542.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('wardrobe_fittings', 'https://images.pexels.com/photos/5705496/pexels-photo-5705496.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('roofing',           'https://images.pexels.com/photos/34597567/pexels-photo-34597567.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('tools',             'https://images.pexels.com/photos/5846253/pexels-photo-5846253.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('power_tools',       'https://images.pexels.com/photos/30413428/pexels-photo-30413428.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('safety',            'https://images.pexels.com/photos/38070/pexels-photo-38070.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop'),
  ('other',             'https://images.pexels.com/photos/38575500/pexels-photo-38575500.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop')
) AS v(ctgry_cd, url)
WHERE nirmaan.mtrl_ctgry_lst_t.ctgry_cd = v.ctgry_cd;
