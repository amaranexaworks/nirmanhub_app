-- 023 — Workforce project status (not_started | in_progress | completed).
-- Attendance is only tracked for in-progress sites. Existing rows default to
-- in_progress so current sites keep showing up in attendance.
SET search_path TO nirmaan, public;

ALTER TABLE nirmaan.wf_prjct_lst_t
  ADD COLUMN IF NOT EXISTS sts_cd VARCHAR(20) NOT NULL DEFAULT 'in_progress';
