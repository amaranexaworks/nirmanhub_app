-- SEED 007 — Starter loan products (provided by the demo financier).
SET search_path TO nirmaan, public;

INSERT INTO nirmaan.loan_prdct_lst_t (nm_tx, rate_tx, range_tx, tenure_tx, for_rle_id, provdr_usr_id, dscn_tx)
SELECT v.nm_tx, v.rate_tx, v.range_tx, v.tenure_tx,
       (SELECT rle_id FROM nirmaan.rle_lst_t WHERE rle_cd = v.for_rle_cd),
       -- first banker user (test users seeded in 004)
       (SELECT u.usr_id FROM nirmaan.usr_lst_t u
          JOIN nirmaan.usr_rle_rel_t ur ON ur.usr_id = u.usr_id
          JOIN nirmaan.rle_lst_t r ON r.rle_id = ur.rle_id
         WHERE r.rle_cd = 'banker' ORDER BY u.usr_id LIMIT 1),
       v.dscn_tx
FROM (VALUES
  ('Contractor Working Capital', '1.5% p.m.', '₹50K – ₹10L', '3 – 24 months', 'contractor', 'Short-term working capital for contractors'),
  ('Material Purchase Loan',      '1.2% p.m.', '₹25K – ₹5L',  '1 – 12 months',  'material_supplier', 'Finance bulk material purchases'),
  ('Equipment Finance',           '13% p.a.',  '₹1L – ₹25L',  '12 – 48 months', 'equipment_rental', 'Buy or lease heavy equipment'),
  ('Worker Personal Loan',        '2% p.m.',   '₹5K – ₹1L',   '1 – 12 months',  'mason', 'Small personal loans for workers'),
  ('Home Construction Loan',      '9% p.a.',   '₹5L – ₹75L',  '5 – 20 years',   'home_owner', 'Finance home construction')
) AS v(nm_tx, rate_tx, range_tx, tenure_tx, for_rle_cd, dscn_tx)
ON CONFLICT (nm_tx) DO UPDATE
  SET rate_tx = EXCLUDED.rate_tx, range_tx = EXCLUDED.range_tx, tenure_tx = EXCLUDED.tenure_tx;
