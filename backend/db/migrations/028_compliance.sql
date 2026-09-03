-- 028 — Statutory compliance parameters (PF / ESI / BOCW).
-- Rates & ceilings are DATA, not constants — they change by statute, so they live in a
-- table the app reads. The compliance run (WorkforceMdl.computeComplianceMdl) joins this
-- to the muster to produce per-worker PF/ESI deductions, employer contributions, and the
-- project BOCW cess. Values are seeded in db/seeds/011_compliance_params.sql.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.cmplnc_param_lst_t (
  param_cd  VARCHAR(40) PRIMARY KEY,      -- PF_RATE, PF_CEILING, ESI_EMP_RATE, ESI_ER_RATE, ESI_CEILING, BOCW_CESS_RATE
  param_val NUMERIC(12,4) NOT NULL,
  descr_tx  VARCHAR(200),
  i_ts      TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in      SMALLINT NOT NULL DEFAULT 1
);
