-- ════════════════════════════════════════════════════════════════════════
-- 031 — Admin-verified KYC (Slice-style slot booking) + admin action audit.
--   • kyc_submsn_lst_t gains slot-booking + verifier fields.
--   • admin_audit_lst_t records every admin action for accountability.
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

-- ── KYC verification slot fields ────────────────────────────────────────────
-- A submission now carries the slot the user booked, who verified it, and the
-- note the admin employee captured on the call.
ALTER TABLE nirmaan.kyc_submsn_lst_t
  ADD COLUMN IF NOT EXISTS slot_ts       TIMESTAMPTZ,               -- booked verification slot
  ADD COLUMN IF NOT EXISTS slot_sts_cd   VARCHAR(20) NOT NULL DEFAULT 'none', -- none|booked|done|missed
  ADD COLUMN IF NOT EXISTS contact_ph_tx VARCHAR(20),              -- number the admin should call
  ADD COLUMN IF NOT EXISTS vrfr_usr_id   BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL, -- admin who verified
  ADD COLUMN IF NOT EXISTS call_note_tx  TEXT;                     -- admin's verification note

CREATE INDEX IF NOT EXISTS idx_kyc_slot ON nirmaan.kyc_submsn_lst_t (slot_ts)
  WHERE slot_sts_cd = 'booked';

-- ── Admin action audit log ──────────────────────────────────────────────────
-- Every privileged action (deactivate user, verify KYC, deactivate a listing,
-- broadcast, …) is appended here so admin activity is fully traceable.
CREATE TABLE IF NOT EXISTS nirmaan.admin_audit_lst_t (
  audit_id     BIGSERIAL PRIMARY KEY,
  admin_usr_id BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  actn_cd      VARCHAR(60)  NOT NULL,   -- e.g. user.deactivate | kyc.approve | job.deactivate
  enty_type_cd VARCHAR(40),             -- user | kyc | job | requirement | material | booking | loan | notification
  enty_id_tx   VARCHAR(60),             -- id of the affected entity
  dtl_tx       TEXT,                    -- free-text detail / reason
  i_ts         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_ts ON nirmaan.admin_audit_lst_t (i_ts DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON nirmaan.admin_audit_lst_t (admin_usr_id, i_ts DESC);
