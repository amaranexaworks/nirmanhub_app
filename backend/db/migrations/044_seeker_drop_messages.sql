-- 044 — Drop the Messages tab from the buyer (seeker) bottom nav so it matches the
-- guest storefront exactly: Home · Category · Orders · Profile (a clean shopping nav
-- like Zepto/Blinkit). Messaging is still reachable from order/vendor pages via the
-- shared /app/chat route — this only removes the primary tab slot. Idempotent.
SET search_path TO nirmaan, public;

DELETE FROM nirmaan.archtyp_mnu_itm_rel_t r
USING nirmaan.archtyp_lst_t a, nirmaan.mnu_itm_lst_t m
WHERE r.archtyp_id = a.archtyp_id AND a.archtyp_cd = 'seeker'
  AND r.mnu_itm_id = m.mnu_itm_id AND m.mnu_type_cd = 'tab' AND m.mnu_itm_cd = 'messages';
