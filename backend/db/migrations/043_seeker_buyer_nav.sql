-- 043 — Give the buyer (seeker) archetype a shopping-style bottom nav that MATCHES
-- the guest storefront, so before-login and after-login feel identical:
--   Home · Category · Orders · Messages · Profile
-- (was Home · Discover · Bookings · Messages · Profile). Other roles keep their
-- purpose-built role tabs. Idempotent.
SET search_path TO nirmaan, public;

-- Drop the buyer's old Discover + Bookings tabs.
DELETE FROM nirmaan.archtyp_mnu_itm_rel_t r
USING nirmaan.archtyp_lst_t a, nirmaan.mnu_itm_lst_t m
WHERE r.archtyp_id = a.archtyp_id AND a.archtyp_cd = 'seeker'
  AND r.mnu_itm_id = m.mnu_itm_id AND m.mnu_type_cd = 'tab'
  AND m.mnu_itm_cd IN ('discover', 'bookings');

-- Add Category (the materials catalog, relabelled) + Orders in their slots.
INSERT INTO nirmaan.archtyp_mnu_itm_rel_t (archtyp_id, mnu_itm_id, lbl_ovrd_tx, sqnce_id)
SELECT a.archtyp_id, m.mnu_itm_id, v.lbl, v.sq
FROM (VALUES ('catalog', 'Category', 2), ('orders', NULL::text, 3)) AS v(cd, lbl, sq)
JOIN nirmaan.archtyp_lst_t a ON a.archtyp_cd = 'seeker'
JOIN nirmaan.mnu_itm_lst_t m ON m.mnu_itm_cd = v.cd AND m.mnu_type_cd = 'tab'
ON CONFLICT (archtyp_id, mnu_itm_id) DO UPDATE
  SET lbl_ovrd_tx = EXCLUDED.lbl_ovrd_tx, sqnce_id = EXCLUDED.sqnce_id, a_in = 1;
