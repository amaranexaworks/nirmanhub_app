-- 008 — Bookings: a seeker's engagement of a pro for a service.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.bookng_lst_t (
  bookng_id     BIGSERIAL PRIMARY KEY,
  seeker_usr_id BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  pro_usr_id    BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL,
  srvc_type_id  INT REFERENCES nirmaan.srvc_type_lst_t(srvc_type_id),
  srvc_tx       VARCHAR(200),
  sts_cd        VARCHAR(20) NOT NULL DEFAULT 'upcoming',   -- upcoming | active | completed | cancelled
  schdl_ts      TIMESTAMPTZ,
  amt_am        NUMERIC(12,2),
  prgrs_pct     INT NOT NULL DEFAULT 0,
  note_tx       TEXT,
  i_ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  u_ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in          SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_bookng_seeker ON nirmaan.bookng_lst_t (seeker_usr_id, sts_cd);
CREATE INDEX IF NOT EXISTS idx_bookng_pro ON nirmaan.bookng_lst_t (pro_usr_id, sts_cd);
