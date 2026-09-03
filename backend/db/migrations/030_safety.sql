-- 030 — Safety & incident reporting.
-- Site incidents (injury / near-miss / unsafe condition / PPE violation), each with a
-- severity, the worker involved, action taken, a photo, and an open/closed status. The
-- safety summary derives the metrics a site runs on: days-since-last-incident and the
-- open-incident count by severity.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.wf_incdnt_lst_t (
  incdnt_id      BIGSERIAL PRIMARY KEY,
  prjct_id       BIGINT NOT NULL REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE CASCADE,
  incdnt_dt      DATE NOT NULL DEFAULT CURRENT_DATE,
  type_cd        VARCHAR(20) NOT NULL,   -- injury | near_miss | unsafe | ppe_violation | property
  svrty_cd       VARCHAR(10) NOT NULL DEFAULT 'low',   -- low | medium | high | critical
  workr_id       BIGINT REFERENCES nirmaan.wf_workr_lst_t(workr_id) ON DELETE SET NULL,
  descr_tx       TEXT NOT NULL,
  action_tx      TEXT,
  photo_url_tx   TEXT,
  sts_cd         VARCHAR(10) NOT NULL DEFAULT 'open',   -- open | closed
  rptd_by_usr_id BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL,
  i_ts           TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in           SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_wf_incdnt_prjct ON nirmaan.wf_incdnt_lst_t (prjct_id, incdnt_dt DESC);
