-- 026 — Labour-contractor billing & reconciliation.
-- A labour contractor supplies workers to a project and raises a bill each period.
-- The classic leakage: the bill claims more man-days than were actually worked. We
-- attribute workers to a contractor, then reconcile the contractor's CLAIMED amount
-- against the amount the muster (verified attendance × day-rate + OT) actually supports.
-- The variance is the fraud/leakage signal.
SET search_path TO nirmaan, public;

-- Attribute a worker to a labour contractor (nullable — direct workers have none).
ALTER TABLE nirmaan.wf_workr_lst_t
  ADD COLUMN IF NOT EXISTS cntrctr_id BIGINT;

-- Contractor master (per project).
CREATE TABLE IF NOT EXISTS nirmaan.wf_cntrctr_lst_t (
  cntrctr_id   BIGSERIAL PRIMARY KEY,
  prjct_id     BIGINT NOT NULL REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE CASCADE,
  nm_tx        VARCHAR(160) NOT NULL,
  phone_tx     VARCHAR(20),
  gst_tx       VARCHAR(20),
  svc_chrg_pct NUMERIC(5,2) NOT NULL DEFAULT 0,   -- contractor's service charge / commission %
  i_ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in         SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_wf_cntrctr_prjct ON nirmaan.wf_cntrctr_lst_t (prjct_id);

-- Now the FK for the worker → contractor link (added after the master exists).
ALTER TABLE nirmaan.wf_workr_lst_t
  ADD CONSTRAINT fk_wf_workr_cntrctr FOREIGN KEY (cntrctr_id)
    REFERENCES nirmaan.wf_cntrctr_lst_t(cntrctr_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wf_workr_cntrctr ON nirmaan.wf_workr_lst_t (cntrctr_id);

-- Bill header (one per contractor per period). computed_am is what the muster supports;
-- claimed_am is what the contractor asked for; variance_am = claimed − (computed + svc chg).
CREATE TABLE IF NOT EXISTS nirmaan.wf_cntrctr_bill_lst_t (
  bill_id      BIGSERIAL PRIMARY KEY,
  cntrctr_id   BIGINT NOT NULL REFERENCES nirmaan.wf_cntrctr_lst_t(cntrctr_id) ON DELETE CASCADE,
  prjct_id     BIGINT NOT NULL REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE CASCADE,
  period_from_dt DATE NOT NULL,
  period_to_dt   DATE NOT NULL,
  worker_cnt   INT NOT NULL DEFAULT 0,
  paid_days_am NUMERIC(10,2) NOT NULL DEFAULT 0,   -- total man-days the muster supports
  wages_am     NUMERIC(14,2) NOT NULL DEFAULT 0,   -- base wages from muster
  ot_am        NUMERIC(14,2) NOT NULL DEFAULT 0,   -- OT value from muster
  svc_chrg_am  NUMERIC(14,2) NOT NULL DEFAULT 0,   -- service charge on top
  computed_am  NUMERIC(14,2) NOT NULL DEFAULT 0,   -- wages + ot + svc chg (system truth)
  claimed_am   NUMERIC(14,2),                      -- what the contractor billed
  variance_am  NUMERIC(14,2),                      -- claimed − computed  (>0 = over-claim)
  sts_cd       VARCHAR(12) NOT NULL DEFAULT 'draft', -- draft | approved | paid | disputed
  notes_tx     TEXT,
  i_ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in         SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_wf_cntrctr_bill_prjct ON nirmaan.wf_cntrctr_bill_lst_t (prjct_id);
CREATE INDEX IF NOT EXISTS idx_wf_cntrctr_bill_cntrctr ON nirmaan.wf_cntrctr_bill_lst_t (cntrctr_id);
