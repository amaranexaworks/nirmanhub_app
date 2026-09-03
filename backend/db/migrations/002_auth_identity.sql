-- ════════════════════════════════════════════════════════════════════════
-- 002 — Identity: users, OTP, login history
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

-- ── Users ──────────────────────────────────────────────────────────────────
-- Phone (mbl_nm) is the primary login identifier (OTP-first). pwd_tx is optional
-- (bcrypt) for password/social flows. actv_rle_id is the user's currently active
-- role and drives which tabs/menus the navigation service returns.
CREATE TABLE IF NOT EXISTS nirmaan.usr_lst_t (
  usr_id       BIGSERIAL PRIMARY KEY,
  mbl_nm       VARCHAR(20)  NOT NULL UNIQUE,
  usr_nm       VARCHAR(80)  UNIQUE,
  dsply_nm     VARCHAR(160),
  fst_nm       VARCHAR(80),
  lst_nm       VARCHAR(80),
  eml_tx       VARCHAR(160),
  avtr_url_tx  TEXT,
  pwd_tx       VARCHAR(200),
  kyc_tier_cd  VARCHAR(20)  NOT NULL DEFAULT 'none',   -- none | basic | verified
  pncd_tx      VARCHAR(12),
  cty_nm       VARCHAR(120),
  lat          NUMERIC(10,6),
  lng          NUMERIC(10,6),
  hdln_tx      VARCHAR(200),
  bio_tx       TEXT,
  day_rate_am  NUMERIC(12,2),
  srvc_rds_km  INT,
  rtng_nm      NUMERIC(3,2) DEFAULT 0,
  rtng_cnt     INT          DEFAULT 0,
  lng_cd_tx    VARCHAR(8)   DEFAULT 'en',              -- preferred UI language
  actv_rle_id  INT,                                     -- FK → rle_lst_t (set post-migration)
  a_in         SMALLINT     NOT NULL DEFAULT 1,
  i_ts         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  u_ts         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usr_mbl ON nirmaan.usr_lst_t (mbl_nm);

-- User skills (worker/expert profiles) — free-text, DB-owned.
CREATE TABLE IF NOT EXISTS nirmaan.usr_skll_rel_t (
  id      BIGSERIAL PRIMARY KEY,
  usr_id  BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  skll_tx VARCHAR(120) NOT NULL,
  a_in    SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (usr_id, skll_tx)
);

-- User languages spoken.
CREATE TABLE IF NOT EXISTS nirmaan.usr_lang_rel_t (
  id       BIGSERIAL PRIMARY KEY,
  usr_id   BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  lang_cd  VARCHAR(8) NOT NULL,
  a_in     SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (usr_id, lang_cd)
);

-- ── OTP ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nirmaan.usr_otp_t (
  otp_id      BIGSERIAL PRIMARY KEY,
  mbl_nm      VARCHAR(20) NOT NULL,
  otp_cd      VARCHAR(8)  NOT NULL,
  purpose_cd  VARCHAR(20) NOT NULL DEFAULT 'login',   -- login | verify | reset
  exp_ts      TIMESTAMPTZ NOT NULL,
  vrfd_in     SMALLINT    NOT NULL DEFAULT 0,
  atmpt_cnt   INT         NOT NULL DEFAULT 0,
  i_ts        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_mbl ON nirmaan.usr_otp_t (mbl_nm, purpose_cd, i_ts DESC);

-- ── Login history ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nirmaan.usr_lgn_hstry_dtl_t (
  lgn_id       BIGSERIAL PRIMARY KEY,
  usr_id       BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL,
  mbl_nm       VARCHAR(20),
  clnt_type_tx VARCHAR(20),                            -- web | mobile
  dvce_tx      VARCHAR(200),
  ip_tx        VARCHAR(60),
  usr_agnt_tx  TEXT,
  succ_in      SMALLINT NOT NULL DEFAULT 1,
  i_ts         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lgn_usr ON nirmaan.usr_lgn_hstry_dtl_t (usr_id, i_ts DESC);
