-- 016 — KYC: identity verification submissions.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.kyc_submsn_lst_t (
  submsn_id    BIGSERIAL PRIMARY KEY,
  usr_id       BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  tier_cd      VARCHAR(20) NOT NULL DEFAULT 'basic',   -- basic | verified
  doc_type_cd  VARCHAR(30) NOT NULL,                    -- aadhaar | pan | dl | voter | passport
  doc_no_tx    VARCHAR(60),
  doc_url_tx   TEXT,
  sts_cd       VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  remrk_tx     VARCHAR(255),
  i_ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  revwd_ts     TIMESTAMPTZ,
  a_in         SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_kyc_usr ON nirmaan.kyc_submsn_lst_t (usr_id, i_ts DESC);
