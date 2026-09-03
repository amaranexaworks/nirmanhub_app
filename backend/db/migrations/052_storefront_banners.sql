-- 052 — Richer storefront banners: 5 hero slides (brand + services) and 3 footer
-- "what we do" banners. Deactivates the old starter set, then upserts the new one.
SET search_path TO nirmaan, public;

-- Retire the previous banners (kept as a_in=0 history; matching titles re-activate below).
UPDATE nirmaan.mtrl_promo_lst_t SET a_in = 0 WHERE slot_cd IN ('hero', 'ad');

-- ── Hero carousel (5) — one brand banner + four service/product banners ──
INSERT INTO nirmaan.mtrl_promo_lst_t (slot_cd, tag_tx, ttl_tx, sub_tx, cta_tx, actn_cd, icn_tx, bg_tx, fg_tx, cta_fg_tx, sqnce_id) VALUES
  ('hero', 'Nirmaan Hub', 'India''s construction network', 'Verified pros · 24×7 support · pan-India', 'Explore', 'materials', 'shield-outline',
   'linear-gradient(135deg, #ffd98a 0%, #f5b301 100%)', '#3a2a00', '#8a5a00', 1),
  ('hero', 'Materials', 'Build materials at trade prices', 'Cement, steel, bricks — delivered to your site', 'Shop now', 'materials', 'cube-outline',
   'linear-gradient(135deg, #f0a878 0%, #e07f4a 100%)', '#3a1f0e', '#9a4a1e', 2),
  ('hero', 'Workforce', 'Hire verified workers near you', 'Masons, electricians, plumbers & more', 'Find workers', 'workers', 'construct-outline',
   'linear-gradient(135deg, #7aa0d9 0%, #4f6fae 100%)', '#ffffff', '#2f4a86', 3),
  ('hero', 'Electricals', 'Fans, wires & fittings — top brands', 'Havells, Crompton, Orient, Atomberg & more', 'Shop now', 'materials', 'aperture-outline',
   'linear-gradient(135deg, #9a86d8 0%, #6b54b8 100%)', '#ffffff', '#4a3894', 4),
  ('hero', 'Work', 'Find construction jobs today', 'Apply to openings across India', 'Browse jobs', 'jobs', 'flash-outline',
   'linear-gradient(135deg, #5cc0a8 0%, #2fa587 100%)', '#ffffff', '#1f7a63', 5)
ON CONFLICT (slot_cd, ttl_tx) DO UPDATE SET
  tag_tx = EXCLUDED.tag_tx, sub_tx = EXCLUDED.sub_tx, cta_tx = EXCLUDED.cta_tx, actn_cd = EXCLUDED.actn_cd,
  icn_tx = EXCLUDED.icn_tx, bg_tx = EXCLUDED.bg_tx, fg_tx = EXCLUDED.fg_tx, cta_fg_tx = EXCLUDED.cta_fg_tx, sqnce_id = EXCLUDED.sqnce_id, a_in = 1;

-- ── Footer "what Nirmaan Hub does" (3) ──
INSERT INTO nirmaan.mtrl_promo_lst_t (slot_cd, tag_tx, ttl_tx, sub_tx, cta_tx, actn_cd, icn_tx, bg_tx, fg_tx, cta_fg_tx, sqnce_id) VALUES
  ('ad', 'Nirmaan Hub', 'One app for your entire site', 'Materials, workers, tools & payments — together', 'Explore', 'materials', 'apps-outline',
   'linear-gradient(135deg, #ffd98a 0%, #f5b301 100%)', '#3a2a00', '#8a5a00', 1),
  ('ad', 'Trusted', 'Verified suppliers & rated pros', 'KYC-checked, reviewed, ready across India', 'See how', 'login', 'shield-outline',
   'linear-gradient(135deg, #7aa0d9 0%, #4f6fae 100%)', '#ffffff', '#2f4a86', 2),
  ('ad', 'Secure', 'Escrow payments & GST invoices', 'Every order protected end-to-end', 'Learn more', 'login', 'lock-closed-outline',
   'linear-gradient(135deg, #5cc0a8 0%, #2fa587 100%)', '#ffffff', '#1f7a63', 3)
ON CONFLICT (slot_cd, ttl_tx) DO UPDATE SET
  tag_tx = EXCLUDED.tag_tx, sub_tx = EXCLUDED.sub_tx, cta_tx = EXCLUDED.cta_tx, actn_cd = EXCLUDED.actn_cd,
  icn_tx = EXCLUDED.icn_tx, bg_tx = EXCLUDED.bg_tx, fg_tx = EXCLUDED.fg_tx, cta_fg_tx = EXCLUDED.cta_fg_tx, sqnce_id = EXCLUDED.sqnce_id, a_in = 1;
