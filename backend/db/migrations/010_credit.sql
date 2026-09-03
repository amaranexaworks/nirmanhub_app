-- 010 — Credit: buy-materials-on-credit orders with a due date.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.crdt_ordr_lst_t (
  ordr_id      BIGSERIAL PRIMARY KEY,
  buyer_usr_id BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  vndr_tx      VARCHAR(160),
  ttl_am       NUMERIC(12,2) NOT NULL DEFAULT 0,
  tenure_days  INT NOT NULL DEFAULT 30,       -- 7 | 15 | 30
  due_ts       TIMESTAMPTZ,
  sts_cd       VARCHAR(20) NOT NULL DEFAULT 'due',   -- due | paid
  ordrd_ts     TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_ts      TIMESTAMPTZ,
  a_in         SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_crdt_buyer ON nirmaan.crdt_ordr_lst_t (buyer_usr_id, sts_cd);

CREATE TABLE IF NOT EXISTS nirmaan.crdt_ordr_item_t (
  id       BIGSERIAL PRIMARY KEY,
  ordr_id  BIGINT NOT NULL REFERENCES nirmaan.crdt_ordr_lst_t(ordr_id) ON DELETE CASCADE,
  nm_tx    VARCHAR(160) NOT NULL,
  emoji_tx VARCHAR(16),
  unit_tx  VARCHAR(40),
  qty      NUMERIC(12,2) NOT NULL DEFAULT 1,
  price_am NUMERIC(12,2) NOT NULL DEFAULT 0
);
