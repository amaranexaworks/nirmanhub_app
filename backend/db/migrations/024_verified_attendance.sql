-- 024 — Verified attendance: geofenced, selfie-backed check-ins.
-- Upgrades the plain P/A/H muster into a fraud-resistant punch: where it happened,
-- how far from the site, whether it fell inside the project geofence, a check-in
-- selfie (face capture; ML match is a later step), who marked it, and a derived
-- verification status. This is the anti-ghost-worker / anti-fake-attendance core.
SET search_path TO nirmaan, public;

-- Per-project geofence radius (metres). A punch farther than this from the site
-- location is flagged. 200 m default covers a typical site + staging area.
ALTER TABLE nirmaan.wf_prjct_lst_t
  ADD COLUMN IF NOT EXISTS geofence_m INT NOT NULL DEFAULT 200;

ALTER TABLE nirmaan.wf_atndnc_t
  ADD COLUMN IF NOT EXISTS chk_in_lat     NUMERIC(10,6),          -- where the punch happened
  ADD COLUMN IF NOT EXISTS chk_in_lng     NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS dist_m         NUMERIC(10,2),          -- metres from the site location
  ADD COLUMN IF NOT EXISTS geo_ok_in      SMALLINT,               -- 1 inside fence, 0 outside, NULL if no GPS
  ADD COLUMN IF NOT EXISTS selfie_url_tx  TEXT,                   -- check-in selfie (data-URL / object key)
  ADD COLUMN IF NOT EXISTS vrfy_sts_cd    VARCHAR(12) NOT NULL DEFAULT 'manual', -- verified | flagged | manual
  ADD COLUMN IF NOT EXISTS chk_in_ts      TIMESTAMPTZ,            -- punch timestamp
  ADD COLUMN IF NOT EXISTS mrkd_by_usr_id BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wf_atndnc_vrfy ON nirmaan.wf_atndnc_t (prjct_id, vrfy_sts_cd);
