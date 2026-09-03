-- 006 — Hiring: market rate reference per trade (worker search reads usr_lst_t).
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.mkt_rate_lst_t (
  mkt_rate_id SERIAL PRIMARY KEY,
  rle_id      INT NOT NULL REFERENCES nirmaan.rle_lst_t(rle_id) ON DELETE CASCADE,
  avg_am      NUMERIC(12,2) NOT NULL,
  min_am      NUMERIC(12,2),
  max_am      NUMERIC(12,2),
  smpls_cnt   INT NOT NULL DEFAULT 0,
  u_ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in        SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (rle_id)
);
