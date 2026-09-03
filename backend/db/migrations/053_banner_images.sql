-- 053 — Real photos on the storefront banners (hero + footer). Reuses the same
-- known-good Pexels photos as the category tiles, at a landscape banner crop.
SET search_path TO nirmaan, public;

-- Landscape crop helper suffix: ?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop
-- Hero banners
UPDATE nirmaan.mtrl_promo_lst_t SET img_url_tx = 'https://images.pexels.com/photos/37121348/pexels-photo-37121348.jpeg?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop' WHERE slot_cd='hero' AND ttl_tx='India''s construction network';
UPDATE nirmaan.mtrl_promo_lst_t SET img_url_tx = 'https://images.pexels.com/photos/29519165/pexels-photo-29519165.jpeg?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop' WHERE slot_cd='hero' AND ttl_tx='Build materials at trade prices';
UPDATE nirmaan.mtrl_promo_lst_t SET img_url_tx = 'https://images.pexels.com/photos/38781389/pexels-photo-38781389.jpeg?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop' WHERE slot_cd='hero' AND ttl_tx='Hire verified workers near you';
UPDATE nirmaan.mtrl_promo_lst_t SET img_url_tx = 'https://images.pexels.com/photos/38697833/pexels-photo-38697833.jpeg?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop' WHERE slot_cd='hero' AND ttl_tx='Fans, wires & fittings — top brands';
UPDATE nirmaan.mtrl_promo_lst_t SET img_url_tx = 'https://images.pexels.com/photos/5846253/pexels-photo-5846253.jpeg?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop' WHERE slot_cd='hero' AND ttl_tx='Find construction jobs today';

-- Footer "what we do" banners
UPDATE nirmaan.mtrl_promo_lst_t SET img_url_tx = 'https://images.pexels.com/photos/37121348/pexels-photo-37121348.jpeg?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop' WHERE slot_cd='ad' AND ttl_tx='One app for your entire site';
UPDATE nirmaan.mtrl_promo_lst_t SET img_url_tx = 'https://images.pexels.com/photos/29301874/pexels-photo-29301874.jpeg?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop' WHERE slot_cd='ad' AND ttl_tx='Verified suppliers & rated pros';
UPDATE nirmaan.mtrl_promo_lst_t SET img_url_tx = 'https://images.pexels.com/photos/5623179/pexels-photo-5623179.jpeg?auto=compress&cs=tinysrgb&w=900&h=420&fit=crop' WHERE slot_cd='ad' AND ttl_tx='Escrow payments & GST invoices';
