-- 035 — Site Cashbook: a per-project cash ledger (money in / money out) that gives a
-- running "cash in hand" for each site. Separate from the wallet (platform money) and
-- from wf_expns_t (categorised project expenses) — this is the site supervisor's day
-- book: Payment In, Payment Out, Expense, Petty Cash. Every row belongs to a project,
-- so access is scoped to that project's owner (same as the rest of the workforce data).
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.cashbook_txn_lst_t (
  cbk_id            BIGSERIAL PRIMARY KEY,
  prjct_id          BIGINT NOT NULL REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE CASCADE,
  kind_cd           VARCHAR(20) NOT NULL,           -- payment_in | payment_out | expense | petty_cash
  dir_cd            VARCHAR(3)  NOT NULL,           -- in | out  (derived from kind at insert)
  amt_am            NUMERIC(14,2) NOT NULL CHECK (amt_am > 0),
  party_tx          VARCHAR(160),                   -- who paid / was paid
  ttl_tx            VARCHAR(200),                   -- short label
  note_tx           TEXT,
  mode_cd           VARCHAR(20),                    -- cash | upi | bank (optional)
  txn_dt            DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by_usr_id BIGINT REFERENCES nirmaan.usr_lst_t(usr_id),
  a_in              SMALLINT NOT NULL DEFAULT 1,
  i_ts              TIMESTAMPTZ NOT NULL DEFAULT now(),
  u_ts              TIMESTAMPTZ
);

-- Hot path: a project's ledger, newest first.
CREATE INDEX IF NOT EXISTS idx_cashbook_prjct
  ON nirmaan.cashbook_txn_lst_t (prjct_id, txn_dt DESC, i_ts DESC);
