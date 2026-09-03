-- ════════════════════════════════════════════════════════════════════════
-- 005 — Domain sample: the marketplace "Requirements" loop.
-- ════════════════════════════════════════════════════════════════════════
-- Included as the reference DOMAIN module so the pattern (master + txn tables →
-- Mdl → Ctrl → routes) is demonstrated end-to-end. Other domains (jobs, bookings,
-- materials, workforce, wages, lending …) follow this exact shape.
SET search_path TO nirmaan, public;

-- Service types (build_house, plumbing, materials, finance …) — DB-owned catalog.
CREATE TABLE IF NOT EXISTS nirmaan.srvc_type_lst_t (
  srvc_type_id   SERIAL PRIMARY KEY,
  srvc_type_cd   VARCHAR(40) NOT NULL UNIQUE,
  srvc_type_nm   VARCHAR(120) NOT NULL,
  icn_tx         VARCHAR(80),
  price_hint_tx  VARCHAR(120),
  sqnce_id       INT NOT NULL DEFAULT 0,
  a_in           SMALLINT NOT NULL DEFAULT 1
);

-- A posted requirement ("I need X, budget Y").
CREATE TABLE IF NOT EXISTS nirmaan.rqrmnt_lst_t (
  rqrmnt_id       BIGSERIAL PRIMARY KEY,
  srvc_type_id    INT REFERENCES nirmaan.srvc_type_lst_t(srvc_type_id),
  ttl_tx          VARCHAR(200) NOT NULL,
  lctn_tx         VARCHAR(200),
  bdgt_tx         VARCHAR(80),
  area_sqft       INT,
  floors          INT,
  dscn_tx         TEXT,
  postd_by_usr_id BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  postd_ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in            SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_rqrmnt_postr ON nirmaan.rqrmnt_lst_t (postd_by_usr_id, postd_ts DESC);

-- A responder's quote against a requirement.
CREATE TABLE IF NOT EXISTS nirmaan.rqrmnt_rspns_t (
  rspns_id       BIGSERIAL PRIMARY KEY,
  rqrmnt_id      BIGINT NOT NULL REFERENCES nirmaan.rqrmnt_lst_t(rqrmnt_id) ON DELETE CASCADE,
  rspndr_usr_id  BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  price_tx       VARCHAR(80),
  msg_tx         TEXT,
  accptd_in      SMALLINT NOT NULL DEFAULT 0,
  rspndd_ts      TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in           SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (rqrmnt_id, rspndr_usr_id)
);
CREATE INDEX IF NOT EXISTS idx_rspns_rqrmnt ON nirmaan.rqrmnt_rspns_t (rqrmnt_id);
