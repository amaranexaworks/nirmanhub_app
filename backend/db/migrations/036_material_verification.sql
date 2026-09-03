-- 036 — Verification-by-category for the materials marketplace.
--   Bulk/structural materials (cement, sand/aggregates, steel, bricks, tiles) and
--   anything an admin marks require verification before they earn the Verified tag.
--   Small consumables auto-approve on upload. (People are verified via KYC already.)
SET search_path TO nirmaan, public;

-- Per-category switch: do items here need admin verification?
ALTER TABLE nirmaan.mtrl_ctgry_lst_t ADD COLUMN IF NOT EXISTS rqrs_vrfy_in SMALLINT NOT NULL DEFAULT 0;

-- Per-item verification state: auto (no verify needed) | pending | verified | rejected.
ALTER TABLE nirmaan.mtrl_item_lst_t ADD COLUMN IF NOT EXISTS vrfy_sts_cd VARCHAR(12) NOT NULL DEFAULT 'auto';

-- Flag the bulk / structural categories (by code or name) as requiring verification.
UPDATE nirmaan.mtrl_ctgry_lst_t
SET rqrs_vrfy_in = 1
WHERE ctgry_cd IN ('cement','cement-aggregates','aggregates','sand','steel','bricks','bricks-blocks','blocks','tiles')
   OR ctgry_nm ILIKE '%cement%' OR ctgry_nm ILIKE '%aggregate%' OR ctgry_nm ILIKE '%steel%'
   OR ctgry_nm ILIKE '%brick%'  OR ctgry_nm ILIKE '%block%'     OR ctgry_nm ILIKE '%tile%'
   OR ctgry_nm ILIKE '%sand%';

-- Grandfather all EXISTING catalog items as verified so nothing disappears from the store.
UPDATE nirmaan.mtrl_item_lst_t SET vrfy_sts_cd = 'verified' WHERE vrfy_sts_cd = 'auto';

CREATE INDEX IF NOT EXISTS idx_mtrl_item_vrfy ON nirmaan.mtrl_item_lst_t (vrfy_sts_cd);
