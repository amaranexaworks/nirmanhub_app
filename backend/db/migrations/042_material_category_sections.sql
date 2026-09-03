-- 042 — Group material categories into named sections so the app can render a clean,
-- sectioned "Category" browse screen (Civil & Structure / Plumbing & Electrical / …)
-- like a modern materials-commerce app, instead of a flat list. Idempotent.
SET search_path TO nirmaan, public;

ALTER TABLE nirmaan.mtrl_ctgry_lst_t ADD COLUMN IF NOT EXISTS sctn_nm VARCHAR(80);

UPDATE nirmaan.mtrl_ctgry_lst_t SET sctn_nm = CASE ctgry_cd
  WHEN 'cement_agg'   THEN 'Civil & Structure'
  WHEN 'steel'        THEN 'Civil & Structure'
  WHEN 'bricks_block' THEN 'Civil & Structure'
  WHEN 'plumbing'     THEN 'Plumbing & Electrical'
  WHEN 'electrical'   THEN 'Plumbing & Electrical'
  WHEN 'paint_finish' THEN 'Finishes & Interiors'
  WHEN 'tools'        THEN 'Tools & Safety'
  WHEN 'safety'       THEN 'Tools & Safety'
  ELSE 'Other Materials'
END
WHERE sctn_nm IS NULL;
