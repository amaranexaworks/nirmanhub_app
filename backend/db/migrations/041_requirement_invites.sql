-- 041 — Requirement invites: a poster can invite a specific professional to bid on
-- their requirement. Powers the "Invited" tab in the app's Leads screen (the "My
-- Proposals" tab is derived from existing rqrmnt_rspns_t, no new table needed).
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.rqrmnt_invit_t (
  invit_id         BIGSERIAL PRIMARY KEY,
  rqrmnt_id        BIGINT NOT NULL REFERENCES nirmaan.rqrmnt_lst_t(rqrmnt_id) ON DELETE CASCADE,
  invtd_usr_id     BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,  -- the pro invited
  invtd_by_usr_id  BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL,          -- the poster
  sts_cd           VARCHAR(20) NOT NULL DEFAULT 'invited',   -- invited | responded | declined
  a_in             SMALLINT NOT NULL DEFAULT 1,
  i_ts             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rqrmnt_id, invtd_usr_id)
);

-- Hot path: a professional's invitations, newest first.
CREATE INDEX IF NOT EXISTS idx_rqrmnt_invit_usr ON nirmaan.rqrmnt_invit_t (invtd_usr_id, i_ts DESC);
