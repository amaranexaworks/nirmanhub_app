-- ════════════════════════════════════════════════════════════════════════
-- 032 — Per-user capability grants. Lets an admin give a specific user extra
-- capabilities (e.g. Workforce management) ON TOP of what their role grants,
-- without changing their role. Merged into the auth context at login.
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.usr_cpblty_rel_t (
  id               BIGSERIAL PRIMARY KEY,
  usr_id           BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  cpblty_id        INT    NOT NULL REFERENCES nirmaan.cpblty_lst_t(cpblty_id) ON DELETE CASCADE,
  grantd_by_usr_id BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL,
  a_in             SMALLINT NOT NULL DEFAULT 1,   -- soft revoke
  i_ts             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usr_id, cpblty_id)
);
CREATE INDEX IF NOT EXISTS idx_usr_cpblty_usr ON nirmaan.usr_cpblty_rel_t (usr_id) WHERE a_in = 1;
