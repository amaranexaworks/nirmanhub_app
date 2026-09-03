-- 039 — Referrals: attribute a new user to the person whose code they signed up with,
-- and track the reward. The referral CODE itself is derived from the referrer's usr_id
-- (no column needed); this table records who actually joined via a code and what reward
-- was earned. A user can be referred at most once (UNIQUE on rfrd_usr_id).
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.rfrl_lst_t (
  rfrl_id      BIGSERIAL PRIMARY KEY,
  rfrr_usr_id  BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,  -- referrer
  rfrd_usr_id  BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,  -- who joined
  rewrd_am     NUMERIC(12,2) NOT NULL DEFAULT 0,
  sts_cd       VARCHAR(20) NOT NULL DEFAULT 'joined',   -- joined | rewarded
  a_in         SMALLINT NOT NULL DEFAULT 1,
  i_ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  u_ts         TIMESTAMPTZ,
  UNIQUE (rfrd_usr_id)                                  -- one referrer per user
);

-- Hot path: a referrer's list of people they brought in, newest first.
CREATE INDEX IF NOT EXISTS idx_rfrl_rfrr ON nirmaan.rfrl_lst_t (rfrr_usr_id, i_ts DESC);
