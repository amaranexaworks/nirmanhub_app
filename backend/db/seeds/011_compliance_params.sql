-- 011 — Statutory compliance parameters (India, current statutory rates).
-- Idempotent: re-running updates the value so a rate change is a one-line seed edit.
--   PF (EPF)  : 12% of wages, wage ceiling ₹15,000/month (employee & employer each).
--   ESI       : employee 0.75%, employer 3.25%, applicable when gross ≤ ₹21,000/month.
--   BOCW cess : 1% of the labour cost (project-level welfare cess).
SET search_path TO nirmaan, public;

INSERT INTO nirmaan.cmplnc_param_lst_t (param_cd, param_val, descr_tx) VALUES
  ('PF_RATE',        12.00,  'Provident Fund contribution rate (%) — employee & employer'),
  ('PF_CEILING',     15000,  'PF wage ceiling (₹/month)'),
  ('ESI_EMP_RATE',    0.75,  'ESI employee contribution rate (%)'),
  ('ESI_ER_RATE',     3.25,  'ESI employer contribution rate (%)'),
  ('ESI_CEILING',    21000,  'ESI applicability wage ceiling (₹/month)'),
  ('BOCW_CESS_RATE',  1.00,  'BOCW welfare cess rate (%) on labour cost')
ON CONFLICT (param_cd) DO UPDATE SET param_val = EXCLUDED.param_val, descr_tx = EXCLUDED.descr_tx;
