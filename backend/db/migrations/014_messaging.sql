-- 014 — Messaging: threads, participants, messages.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.msg_thrd_lst_t (
  thrd_id  BIGSERIAL PRIMARY KEY,
  subj_tx  VARCHAR(200),
  i_ts     TIMESTAMPTZ NOT NULL DEFAULT now(),
  u_ts     TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in     SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS nirmaan.msg_thrd_prtcpnt_t (
  id      BIGSERIAL PRIMARY KEY,
  thrd_id BIGINT NOT NULL REFERENCES nirmaan.msg_thrd_lst_t(thrd_id) ON DELETE CASCADE,
  usr_id  BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  UNIQUE (thrd_id, usr_id)
);

CREATE TABLE IF NOT EXISTS nirmaan.msg_lst_t (
  msg_id      BIGSERIAL PRIMARY KEY,
  thrd_id     BIGINT NOT NULL REFERENCES nirmaan.msg_thrd_lst_t(thrd_id) ON DELETE CASCADE,
  sndr_usr_id BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  body_tx     TEXT,
  voice_secs  INT,
  read_in     SMALLINT NOT NULL DEFAULT 0,
  i_ts        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_msg_thrd ON nirmaan.msg_lst_t (thrd_id, i_ts);
