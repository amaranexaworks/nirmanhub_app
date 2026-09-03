-- 012 — Wages: append-only payment register, adjustments, and an audit trail.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.wage_pymnt_lst_t (
  pymnt_id   BIGSERIAL PRIMARY KEY,
  rcpt_no_tx VARCHAR(40),
  prjct_id   BIGINT REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE SET NULL,
  workr_id   BIGINT REFERENCES nirmaan.wf_workr_lst_t(workr_id) ON DELETE SET NULL,
  amt_am     NUMERIC(12,2) NOT NULL,
  method_cd  VARCHAR(20) NOT NULL DEFAULT 'cash',  -- cash|upi|phonepe|gpay|paytm|bank|neft|rtgs|imps|cheque|mixed
  txn_no_tx  VARCHAR(80),
  utr_tx     VARCHAR(80),
  bank_nm_tx VARCHAR(120),
  upi_tx     VARCHAR(80),
  note_tx    VARCHAR(255),
  rep_nm_tx  VARCHAR(160),
  is_prtl_in SMALLINT NOT NULL DEFAULT 0,
  grp_id_tx  VARCHAR(40),
  paid_by_tx VARCHAR(160),
  aprvd_by_tx VARCHAR(160),
  sts_cd     VARCHAR(20) NOT NULL DEFAULT 'paid',  -- paid | pending-approval | void
  crtd_by_tx VARCHAR(160),
  crtd_ts    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wage_pymnt_prjct ON nirmaan.wage_pymnt_lst_t (prjct_id, crtd_ts DESC);

CREATE TABLE IF NOT EXISTS nirmaan.wage_adjstmnt_t (
  adjstmnt_id BIGSERIAL PRIMARY KEY,
  prjct_id   BIGINT REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE SET NULL,
  workr_id   BIGINT REFERENCES nirmaan.wf_workr_lst_t(workr_id) ON DELETE SET NULL,
  kind_cd    VARCHAR(20) NOT NULL,                 -- bonus | incentive | penalty | deduction
  amt_am     NUMERIC(12,2) NOT NULL,
  reason_tx  VARCHAR(255),
  sts_cd     VARCHAR(20) NOT NULL DEFAULT 'active', -- active | void
  crtd_by_tx VARCHAR(160),
  crtd_ts    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nirmaan.wage_audit_dtl_t (
  audit_id  BIGSERIAL PRIMARY KEY,
  action_tx VARCHAR(80) NOT NULL,
  detail_tx TEXT,
  usr_tx    VARCHAR(160),
  role_tx   VARCHAR(80),
  at_ts     TIMESTAMPTZ NOT NULL DEFAULT now()
);
