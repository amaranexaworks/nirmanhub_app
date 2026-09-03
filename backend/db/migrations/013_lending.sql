-- 013 — Lending: loan products and applications.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.loan_prdct_lst_t (
  prdct_id      BIGSERIAL PRIMARY KEY,
  nm_tx         VARCHAR(160) NOT NULL,
  rate_tx       VARCHAR(40),
  range_tx      VARCHAR(80),
  tenure_tx     VARCHAR(80),
  for_rle_id    INT REFERENCES nirmaan.rle_lst_t(rle_id),
  provdr_usr_id BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL,
  actv_in       SMALLINT NOT NULL DEFAULT 1,
  dscn_tx       TEXT,
  a_in          SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (nm_tx)
);

CREATE TABLE IF NOT EXISTS nirmaan.loan_aplctn_lst_t (
  aplctn_id     BIGSERIAL PRIMARY KEY,
  prdct_id      BIGINT NOT NULL REFERENCES nirmaan.loan_prdct_lst_t(prdct_id) ON DELETE CASCADE,
  aplcnt_usr_id BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  amt_am        NUMERIC(14,2),
  tenure_tx     VARCHAR(80),
  purpose_tx    VARCHAR(255),
  sts_cd        VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | disbursed
  remrk_tx      VARCHAR(255),
  i_ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  u_ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in          SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_loan_aplcnt ON nirmaan.loan_aplctn_lst_t (aplcnt_usr_id, i_ts DESC);
