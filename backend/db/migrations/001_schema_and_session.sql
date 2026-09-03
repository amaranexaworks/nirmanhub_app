-- ════════════════════════════════════════════════════════════════════════
-- 001 — Schema bootstrap + session store
-- ════════════════════════════════════════════════════════════════════════
-- Naming convention (inherited from the WMS-web backend):
--   *_lst_t  = master / list table          *_rel_t = relation (mapping) table
--   *_dtl_t  = detail / history table        _t      = table suffix
--   _id  = surrogate key   _cd = business code   _nm = name/label
--   _tx  = free text       _in = indicator (0/1 boolean)   _ts = timestamp
--   _am  = amount          _id columns are FKs when they name another table
-- All application tables live in the `nirmaan` schema.

CREATE SCHEMA IF NOT EXISTS nirmaan;
SET search_path TO nirmaan, public;

-- Session store for express-session + connect-pg-simple.
CREATE TABLE IF NOT EXISTS nirmaan.user_session_t (
  sid    VARCHAR      NOT NULL COLLATE "default",
  sess   JSON         NOT NULL,
  expire TIMESTAMPTZ  NOT NULL,
  CONSTRAINT user_session_t_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS idx_user_session_expire ON nirmaan.user_session_t (expire);
