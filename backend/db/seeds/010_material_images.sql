-- SEED 010 — Curated professional product photos per material category.
-- Items inherit their category photo via COALESCE in the catalog query.
-- (Stable Unsplash CDN URLs, verified to load.)
SET search_path TO nirmaan, public;

UPDATE nirmaan.mtrl_ctgry_lst_t SET img_url_tx = v.url
FROM (VALUES
  ('cement_agg',   'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80&auto=format&fit=crop'),
  ('steel',        'https://images.unsplash.com/photo-1591955506264-3f5a6834570a?w=400&q=80&auto=format&fit=crop'),
  ('bricks_block', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80&auto=format&fit=crop'),
  ('plumbing',     'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&q=80&auto=format&fit=crop'),
  ('electrical',   'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&q=80&auto=format&fit=crop'),
  ('paint_finish', 'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=400&q=80&auto=format&fit=crop'),
  ('tools',        'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=80&auto=format&fit=crop'),
  ('safety',       'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80&auto=format&fit=crop'),
  ('other',        'https://images.unsplash.com/photo-1587582423116-ec07293f0395?w=400&q=80&auto=format&fit=crop')
) AS v(ctgry_cd, url)
WHERE nirmaan.mtrl_ctgry_lst_t.ctgry_cd = v.ctgry_cd;
