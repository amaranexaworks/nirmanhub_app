-- 017 — Billing: subscription plans + per-user subscriptions.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.sbscrptn_plan_lst_t (
  plan_id     SERIAL PRIMARY KEY,
  plan_cd     VARCHAR(20) NOT NULL,        -- free | pro
  cycle_cd    VARCHAR(20) NOT NULL,        -- monthly | yearly
  price_am    NUMERIC(10,2) NOT NULL DEFAULT 0,
  benefits_tx TEXT,
  a_in        SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (plan_cd, cycle_cd)
);

CREATE TABLE IF NOT EXISTS nirmaan.usr_sbscrptn_t (
  id        BIGSERIAL PRIMARY KEY,
  usr_id    BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  plan_cd   VARCHAR(20) NOT NULL DEFAULT 'free',
  cycle_cd  VARCHAR(20) NOT NULL DEFAULT 'monthly',
  strt_ts   TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_ts    TIMESTAMPTZ,
  sts_cd    VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | expired | cancelled
  i_ts      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sbscrptn_usr ON nirmaan.usr_sbscrptn_t (usr_id, sts_cd);
