-- SEED 008 — Subscription plans (free + pro monthly/yearly).
SET search_path TO nirmaan, public;

INSERT INTO nirmaan.sbscrptn_plan_lst_t (plan_cd, cycle_cd, price_am, benefits_tx) VALUES
  ('free', 'monthly',   0, '3 leads/month|Basic profile|Standard support'),
  ('pro',  'monthly', 299, 'Unlimited leads|Verified badge|Priority in search|Analytics|Priority support'),
  ('pro',  'yearly', 2499, 'Unlimited leads|Verified badge|Priority in search|Analytics|Priority support|2 months free')
ON CONFLICT (plan_cd, cycle_cd) DO UPDATE
  SET price_am = EXCLUDED.price_am, benefits_tx = EXCLUDED.benefits_tx;
