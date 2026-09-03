-- 027 — Digital Worker Passport: a portable record that follows the PERSON (keyed by
-- Aadhaar), not a single enrolment. Aggregates every project a worker has been on, their
-- attendance reliability, verified-punch trust ratio, and their certifications — so a new
-- employer can see a real, tamper-evident history instead of re-verifying from scratch.
-- The aggregation itself is computed in the model; this migration adds the one thing that
-- must persist beyond a single enrolment: certifications.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.wf_workr_cert_lst_t (
  cert_id    BIGSERIAL PRIMARY KEY,
  workr_id   BIGINT REFERENCES nirmaan.wf_workr_lst_t(workr_id) ON DELETE SET NULL,
  aadhaar_tx VARCHAR(20),                 -- denormalised so a cert follows the person across enrolments
  nm_tx      VARCHAR(160) NOT NULL,       -- e.g. "Scaffolding Level 2", "ITI Electrician"
  issuer_tx  VARCHAR(160),                -- issuing body (NSDC / ITI / employer)
  issued_dt  DATE,
  expiry_dt  DATE,
  doc_url_tx TEXT,                        -- certificate image / PDF
  vrfy_in    SMALLINT NOT NULL DEFAULT 0, -- verified by an authority?
  i_ts       TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in       SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_wf_cert_workr   ON nirmaan.wf_workr_cert_lst_t (workr_id);
CREATE INDEX IF NOT EXISTS idx_wf_cert_aadhaar ON nirmaan.wf_workr_cert_lst_t (aadhaar_tx) WHERE aadhaar_tx IS NOT NULL;
