-- 036 — Attribute a material order to a site/project, so its cost lands on that
-- site automatically (e.g. "50 bags cement for Site A"). Nullable = personal order.
SET search_path TO nirmaan, public;

ALTER TABLE nirmaan.mtrl_ordr_lst_t
  ADD COLUMN IF NOT EXISTS prjct_id BIGINT REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mtrl_ordr_prjct ON nirmaan.mtrl_ordr_lst_t (prjct_id) WHERE prjct_id IS NOT NULL;
