-- 040 — Portfolio: completed-project showcase entries owned by a professional
-- (contractor/worker/expert), shown on their profile so customers can judge quality.
-- Images are stored via the files module; only the URL/path is kept here.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.prtfl_lst_t (
  prtfl_id     BIGSERIAL PRIMARY KEY,
  ownr_usr_id  BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  ttl_tx       VARCHAR(200) NOT NULL,
  desc_tx      TEXT,
  cover_url_tx TEXT,                         -- cover image (from files module)
  lctn_tx      VARCHAR(160),
  year_nm      INT,                          -- year completed
  a_in         SMALLINT NOT NULL DEFAULT 1,
  i_ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  u_ts         TIMESTAMPTZ
);

-- Hot path: an owner's portfolio, newest first.
CREATE INDEX IF NOT EXISTS idx_prtfl_ownr ON nirmaan.prtfl_lst_t (ownr_usr_id, i_ts DESC);
