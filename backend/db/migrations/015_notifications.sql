-- 015 — Notifications: per-user notification feed.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.notfcn_lst_t (
  notfcn_id BIGSERIAL PRIMARY KEY,
  usr_id    BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  ttl_tx    VARCHAR(200) NOT NULL,
  body_tx   TEXT,
  type_cd   VARCHAR(30) NOT NULL DEFAULT 'general',  -- general|job|booking|payment|kyc|message|loan
  url_tx    VARCHAR(200),
  read_in   SMALLINT NOT NULL DEFAULT 0,
  i_ts      TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in      SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_notfcn_usr ON nirmaan.notfcn_lst_t (usr_id, read_in, i_ts DESC);
