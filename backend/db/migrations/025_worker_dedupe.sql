-- 025 — Worker identity dedupe: fast lookup by Aadhaar / mobile so the same person
-- can't be silently enrolled twice (ghost workers → duplicate wages). We index the
-- identity columns and record a detected duplicate link on the worker row. We do NOT
-- hard-unique Aadhaar — a genuine worker legitimately moves between projects — instead
-- the app surfaces matches at enrolment and flags them for a human decision.
SET search_path TO nirmaan, public;

CREATE INDEX IF NOT EXISTS idx_wf_workr_aadhaar ON nirmaan.wf_workr_lst_t (aadhaar_tx) WHERE aadhaar_tx IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_workr_mobile  ON nirmaan.wf_workr_lst_t (mobile_tx)  WHERE mobile_tx  IS NOT NULL;

ALTER TABLE nirmaan.wf_workr_lst_t
  ADD COLUMN IF NOT EXISTS dup_of_workr_id BIGINT REFERENCES nirmaan.wf_workr_lst_t(workr_id) ON DELETE SET NULL;
