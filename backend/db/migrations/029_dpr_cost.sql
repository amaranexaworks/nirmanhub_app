-- 029 — Daily Progress Report (DPR) + project cost tracking.
-- The DPR is the site's daily heartbeat: manpower (auto-derived from the muster),
-- activities done, weather, issues, materials consumed. Cost tracking adds a project
-- budget so the cost summary (labour from attendance + expenses by category) can be read
-- as budget-vs-actual instead of a raw expense list.
SET search_path TO nirmaan, public;

ALTER TABLE nirmaan.wf_prjct_lst_t
  ADD COLUMN IF NOT EXISTS budget_am NUMERIC(14,2);

CREATE TABLE IF NOT EXISTS nirmaan.wf_dpr_lst_t (
  dpr_id       BIGSERIAL PRIMARY KEY,
  prjct_id     BIGINT NOT NULL REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE CASCADE,
  dpr_dt       DATE NOT NULL DEFAULT CURRENT_DATE,
  manpower_cnt INT,                    -- present workers that day (snapshot from muster)
  wthr_tx      VARCHAR(40),            -- weather: sunny | rain | cloudy | ...
  activities_tx TEXT,                  -- work done today
  issues_tx    TEXT,                   -- blockers / delays
  materials_tx TEXT,                   -- materials consumed
  photo_url_tx TEXT,
  crtd_by_usr_id BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL,
  i_ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in         SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_wf_dpr_prjct_dt ON nirmaan.wf_dpr_lst_t (prjct_id, dpr_dt DESC);
