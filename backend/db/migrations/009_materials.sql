-- 009 — Materials: category catalog, items, orders (quick-commerce).
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.mtrl_ctgry_lst_t (
  ctgry_id   SERIAL PRIMARY KEY,
  ctgry_cd   VARCHAR(40) NOT NULL UNIQUE,
  ctgry_nm   VARCHAR(120) NOT NULL,
  icn_tx     VARCHAR(80),
  sqnce_id   INT NOT NULL DEFAULT 0,
  a_in       SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS nirmaan.mtrl_item_lst_t (
  item_id     BIGSERIAL PRIMARY KEY,
  nm_tx       VARCHAR(160) NOT NULL,
  emoji_tx    VARCHAR(16),
  ctgry_id    INT REFERENCES nirmaan.mtrl_ctgry_lst_t(ctgry_id),
  price_am    NUMERIC(12,2) NOT NULL,
  unit_tx     VARCHAR(40),
  eta_min     INT,
  poplr_in    SMALLINT NOT NULL DEFAULT 0,
  vndr_usr_id BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL,
  a_in        SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (nm_tx)
);
CREATE INDEX IF NOT EXISTS idx_mtrl_item_ctgry ON nirmaan.mtrl_item_lst_t (ctgry_id);

CREATE TABLE IF NOT EXISTS nirmaan.mtrl_ordr_lst_t (
  ordr_id     BIGSERIAL PRIMARY KEY,
  buyer_usr_id BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  ttl_am      NUMERIC(12,2) NOT NULL DEFAULT 0,
  sts_cd      VARCHAR(20) NOT NULL DEFAULT 'placed',   -- placed | packed | delivered | cancelled
  dlvry_tx    VARCHAR(200),
  i_ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in        SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_mtrl_ordr_buyer ON nirmaan.mtrl_ordr_lst_t (buyer_usr_id, i_ts DESC);

CREATE TABLE IF NOT EXISTS nirmaan.mtrl_ordr_item_t (
  id       BIGSERIAL PRIMARY KEY,
  ordr_id  BIGINT NOT NULL REFERENCES nirmaan.mtrl_ordr_lst_t(ordr_id) ON DELETE CASCADE,
  item_id  BIGINT REFERENCES nirmaan.mtrl_item_lst_t(item_id),
  nm_tx    VARCHAR(160) NOT NULL,
  unit_tx  VARCHAR(40),
  qty      NUMERIC(12,2) NOT NULL DEFAULT 1,
  price_am NUMERIC(12,2) NOT NULL DEFAULT 0
);
