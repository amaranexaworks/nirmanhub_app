-- 011 — Workforce: projects, supervisors, managed workers, attendance,
--        expenses, advances, payouts. (Mirrors the app's workforceStore.)
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.wf_prjct_lst_t (
  prjct_id   BIGSERIAL PRIMARY KEY,
  ownr_usr_id BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  nm_tx      VARCHAR(200) NOT NULL,
  lctn_lat   NUMERIC(10,6),
  lctn_lng   NUMERIC(10,6),
  lctn_lbl   VARCHAR(200),
  notes_tx   TEXT,
  i_ts       TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in       SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_wf_prjct_ownr ON nirmaan.wf_prjct_lst_t (ownr_usr_id);

CREATE TABLE IF NOT EXISTS nirmaan.wf_suprvsr_lst_t (
  suprvsr_id BIGSERIAL PRIMARY KEY,
  prjct_id   BIGINT NOT NULL REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE CASCADE,
  nm_tx      VARCHAR(160) NOT NULL,
  phone_tx   VARCHAR(20),
  site_tx    VARCHAR(160),
  a_in       SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS nirmaan.wf_workr_lst_t (
  workr_id     BIGSERIAL PRIMARY KEY,
  prjct_id     BIGINT NOT NULL REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE CASCADE,
  suprvsr_id   BIGINT REFERENCES nirmaan.wf_suprvsr_lst_t(suprvsr_id) ON DELETE SET NULL,
  nm_tx        VARCHAR(160) NOT NULL,
  trade_tx     VARCHAR(80),
  emoji_tx     VARCHAR(16),
  day_rate_am  NUMERIC(12,2),
  photo_url_tx TEXT,
  mobile_tx    VARCHAR(20),
  dob_dt       DATE,
  gender_cd    VARCHAR(10),
  addr_tx      TEXT,
  skill_cd     VARCHAR(20),                 -- unskilled | semi-skilled | skilled | highly-skilled
  joined_dt    DATE,
  aadhaar_tx   VARCHAR(20),
  pan_tx       VARCHAR(20),
  bank_nm_tx   VARCHAR(120),
  acct_no_tx   VARCHAR(40),
  ifsc_tx      VARCHAR(20),
  upi_tx       VARCHAR(80),
  emrgncy_nm_tx    VARCHAR(160),
  emrgncy_phone_tx VARCHAR(20),
  a_in         SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_wf_workr_prjct ON nirmaan.wf_workr_lst_t (prjct_id);

CREATE TABLE IF NOT EXISTS nirmaan.wf_atndnc_t (
  id        BIGSERIAL PRIMARY KEY,
  prjct_id  BIGINT NOT NULL REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE CASCADE,
  workr_id  BIGINT NOT NULL REFERENCES nirmaan.wf_workr_lst_t(workr_id) ON DELETE CASCADE,
  atndnc_dt DATE NOT NULL,
  sts_cd    VARCHAR(4) NOT NULL DEFAULT 'P',   -- P | A | H | L | WO
  ot_hrs    NUMERIC(5,2) NOT NULL DEFAULT 0,
  UNIQUE (workr_id, atndnc_dt)
);
CREATE INDEX IF NOT EXISTS idx_wf_atndnc_prjct_dt ON nirmaan.wf_atndnc_t (prjct_id, atndnc_dt);

CREATE TABLE IF NOT EXISTS nirmaan.wf_expns_t (
  expns_id  BIGSERIAL PRIMARY KEY,
  prjct_id  BIGINT NOT NULL REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE CASCADE,
  ctgry_cd  VARCHAR(20) NOT NULL,              -- material | labour | equipment | transport | misc
  ttl_tx    VARCHAR(200) NOT NULL,
  amt_am    NUMERIC(12,2) NOT NULL,
  expns_dt  DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_by_tx VARCHAR(160),
  setld_in  SMALLINT NOT NULL DEFAULT 0,
  rcpt_url_tx TEXT,
  i_ts      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nirmaan.wf_advnc_t (
  advnc_id  BIGSERIAL PRIMARY KEY,
  workr_id  BIGINT NOT NULL REFERENCES nirmaan.wf_workr_lst_t(workr_id) ON DELETE CASCADE,
  amt_am    NUMERIC(12,2) NOT NULL,
  advnc_dt  DATE NOT NULL DEFAULT CURRENT_DATE,
  note_tx   VARCHAR(200),
  i_ts      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nirmaan.wf_payout_t (
  payout_id  BIGSERIAL PRIMARY KEY,
  prjct_id   BIGINT NOT NULL REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE CASCADE,
  workr_id   BIGINT NOT NULL REFERENCES nirmaan.wf_workr_lst_t(workr_id) ON DELETE CASCADE,
  amt_am     NUMERIC(12,2) NOT NULL,
  period_key_tx VARCHAR(20),
  payout_dt  DATE NOT NULL DEFAULT CURRENT_DATE,
  i_ts       TIMESTAMPTZ NOT NULL DEFAULT now()
);
