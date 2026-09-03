-- ════════════════════════════════════════════════════════════════════════
-- 003 — RBAC: archetypes, roles, capabilities, departments, designations
--         and the user↔role / user↔department mappings.
-- ════════════════════════════════════════════════════════════════════════
-- Model (mirrors the app's roles.ts, now DB-owned):
--   archetype (6)  ──<  role (~55)            a role belongs to one archetype
--   archetype      ──<  capability (M:N)      capabilities gate features/routes
--   department     ──<  designation           org structure (logins/departments)
--   user           ──<  role  (M:N)           "roles mapping / assign"
--   user           ──<  department (M:N)       "departments mapping"
SET search_path TO nirmaan, public;

-- ── Archetypes (top-level user personas) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS nirmaan.archtyp_lst_t (
  archtyp_id  SERIAL PRIMARY KEY,
  archtyp_cd  VARCHAR(40) NOT NULL UNIQUE,   -- seeker | worker | expert | orchestrator | vendor | financier
  archtyp_nm  VARCHAR(80) NOT NULL,
  dscn_tx     VARCHAR(255),
  icn_tx      VARCHAR(80),
  sqnce_id    INT NOT NULL DEFAULT 0,
  a_in        SMALLINT NOT NULL DEFAULT 1
);

-- ── Roles (fine-grained trades/professions) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS nirmaan.rle_lst_t (
  rle_id      SERIAL PRIMARY KEY,
  rle_cd      VARCHAR(60) NOT NULL UNIQUE,   -- mason | architect | material_supplier ...
  rle_nm      VARCHAR(120) NOT NULL,         -- display label
  archtyp_id  INT NOT NULL REFERENCES nirmaan.archtyp_lst_t(archtyp_id),
  icn_tx      VARCHAR(80),
  emoji_tx    VARCHAR(16),
  dscn_tx     VARCHAR(255),
  sqnce_id    INT NOT NULL DEFAULT 0,
  a_in        SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_rle_archtyp ON nirmaan.rle_lst_t (archtyp_id);

-- usr_lst_t.actv_rle_id references a role — add the FK now that rle_lst_t exists.
ALTER TABLE nirmaan.usr_lst_t
  DROP CONSTRAINT IF EXISTS fk_usr_actv_rle;
ALTER TABLE nirmaan.usr_lst_t
  ADD CONSTRAINT fk_usr_actv_rle FOREIGN KEY (actv_rle_id)
  REFERENCES nirmaan.rle_lst_t(rle_id) ON DELETE SET NULL;

-- ── Capabilities (feature/route guards) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS nirmaan.cpblty_lst_t (
  cpblty_id  SERIAL PRIMARY KEY,
  cpblty_cd  VARCHAR(60) NOT NULL UNIQUE,    -- browse_marketplace | hire_workers | run_payroll ...
  cpblty_nm  VARCHAR(120) NOT NULL,
  dscn_tx    VARCHAR(255),
  a_in       SMALLINT NOT NULL DEFAULT 1
);

-- Archetype → capability grants (M:N).
CREATE TABLE IF NOT EXISTS nirmaan.archtyp_cpblty_rel_t (
  id          SERIAL PRIMARY KEY,
  archtyp_id  INT NOT NULL REFERENCES nirmaan.archtyp_lst_t(archtyp_id) ON DELETE CASCADE,
  cpblty_id   INT NOT NULL REFERENCES nirmaan.cpblty_lst_t(cpblty_id) ON DELETE CASCADE,
  a_in        SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (archtyp_id, cpblty_id)
);

-- ── Departments & designations (org structure) ──────────────────────────────
CREATE TABLE IF NOT EXISTS nirmaan.dprtmnt_lst_t (
  dprtmnt_id  SERIAL PRIMARY KEY,
  dprtmnt_cd  VARCHAR(40) NOT NULL UNIQUE,
  dprtmnt_nm  VARCHAR(120) NOT NULL,
  dscn_tx     VARCHAR(255),
  sqnce_id    INT NOT NULL DEFAULT 0,
  a_in        SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS nirmaan.dsgntn_lst_t (
  dsgntn_id   SERIAL PRIMARY KEY,
  dsgntn_cd   VARCHAR(60) NOT NULL UNIQUE,
  dsgntn_nm   VARCHAR(120) NOT NULL,
  dprtmnt_id  INT NOT NULL REFERENCES nirmaan.dprtmnt_lst_t(dprtmnt_id) ON DELETE CASCADE,
  sqnce_id    INT NOT NULL DEFAULT 0,
  a_in        SMALLINT NOT NULL DEFAULT 1
);

-- ── User ↔ Role mapping (roles assignment) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS nirmaan.usr_rle_rel_t (
  id       BIGSERIAL PRIMARY KEY,
  usr_id   BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  rle_id   INT    NOT NULL REFERENCES nirmaan.rle_lst_t(rle_id) ON DELETE CASCADE,
  prmry_in SMALLINT NOT NULL DEFAULT 0,        -- 1 = primary role
  a_in     SMALLINT NOT NULL DEFAULT 1,
  i_ts     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usr_id, rle_id)
);
CREATE INDEX IF NOT EXISTS idx_usr_rle_usr ON nirmaan.usr_rle_rel_t (usr_id);

-- ── User ↔ Department mapping (logins / departments) ────────────────────────
CREATE TABLE IF NOT EXISTS nirmaan.usr_dprtmnt_rel_t (
  id          BIGSERIAL PRIMARY KEY,
  usr_id      BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  dprtmnt_id  INT    NOT NULL REFERENCES nirmaan.dprtmnt_lst_t(dprtmnt_id) ON DELETE CASCADE,
  dsgntn_id   INT    REFERENCES nirmaan.dsgntn_lst_t(dsgntn_id) ON DELETE SET NULL,
  prmry_in    SMALLINT NOT NULL DEFAULT 0,
  a_in        SMALLINT NOT NULL DEFAULT 1,
  i_ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usr_id, dprtmnt_id)
);
CREATE INDEX IF NOT EXISTS idx_usr_dprtmnt_usr ON nirmaan.usr_dprtmnt_rel_t (usr_id);
