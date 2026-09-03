-- ════════════════════════════════════════════════════════════════════════
-- 020 — Wallet: a simple per-user money ledger (credits & debits).
-- Balance is derived (SUM of credits − debits); no cached balance column, so
-- it can never drift. Add-money / withdraw both write one ledger row.
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.wallet_txn_lst_t (
  txn_id   BIGSERIAL PRIMARY KEY,
  usr_id   BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  kind_cd  VARCHAR(10) NOT NULL,            -- 'credit' | 'debit'
  amt_am   NUMERIC(14,2) NOT NULL CHECK (amt_am > 0),
  ttl_tx   VARCHAR(160) NOT NULL,
  ref_tx   VARCHAR(80),                     -- optional external/order reference
  sts_cd   VARCHAR(20) NOT NULL DEFAULT 'success',
  a_in     SMALLINT NOT NULL DEFAULT 1,
  i_ts     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_usr ON nirmaan.wallet_txn_lst_t (usr_id, i_ts DESC);
