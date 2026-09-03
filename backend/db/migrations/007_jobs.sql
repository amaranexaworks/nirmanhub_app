-- 007 — Jobs: postings, applications, saved jobs.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.job_lst_t (
  job_id         BIGSERIAL PRIMARY KEY,
  ttl_tx         VARCHAR(200) NOT NULL,
  employer_usr_id BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  rle_id         INT REFERENCES nirmaan.rle_lst_t(rle_id),   -- trade needed
  pay_am         NUMERIC(12,2),
  pay_unit_cd    VARCHAR(10) NOT NULL DEFAULT 'day',          -- day | job
  days_cnt       INT,
  lctn_tx        VARCHAR(200),
  urgnt_in       SMALLINT NOT NULL DEFAULT 0,
  dscn_tx        TEXT,
  sts_cd         VARCHAR(20) NOT NULL DEFAULT 'open',          -- open | closed
  postd_ts       TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in           SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_job_employer ON nirmaan.job_lst_t (employer_usr_id, postd_ts DESC);

CREATE TABLE IF NOT EXISTS nirmaan.job_aplctn_t (
  aplctn_id      BIGSERIAL PRIMARY KEY,
  job_id         BIGINT NOT NULL REFERENCES nirmaan.job_lst_t(job_id) ON DELETE CASCADE,
  aplcnt_usr_id  BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  msg_tx         TEXT,
  sts_cd         VARCHAR(20) NOT NULL DEFAULT 'applied',        -- applied | shortlisted | rejected | hired
  i_ts           TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in           SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (job_id, aplcnt_usr_id)
);

CREATE TABLE IF NOT EXISTS nirmaan.job_svd_rel_t (
  id      BIGSERIAL PRIMARY KEY,
  job_id  BIGINT NOT NULL REFERENCES nirmaan.job_lst_t(job_id) ON DELETE CASCADE,
  usr_id  BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  i_ts    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, usr_id)
);
