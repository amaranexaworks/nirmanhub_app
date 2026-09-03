-- ════════════════════════════════════════════════════════════════════════
-- 019 — Product imagery: real photos for material items & categories.
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

ALTER TABLE nirmaan.mtrl_ctgry_lst_t ADD COLUMN IF NOT EXISTS img_url_tx TEXT;
ALTER TABLE nirmaan.mtrl_item_lst_t  ADD COLUMN IF NOT EXISTS img_url_tx TEXT;
