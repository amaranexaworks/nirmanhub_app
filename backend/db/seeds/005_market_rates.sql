-- SEED 005 — Market rates for common trades (₹/day day-rate references).
SET search_path TO nirmaan, public;

INSERT INTO nirmaan.mkt_rate_lst_t (rle_id, avg_am, min_am, max_am, smpls_cnt)
SELECT r.rle_id, v.avg_am, v.min_am, v.max_am, v.smpls_cnt
FROM (VALUES
  ('mason',        850, 650, 1100, 320),
  ('labour',       650, 500,  850, 540),
  ('carpenter',    900, 700, 1200, 210),
  ('painter',      750, 600,  950, 180),
  ('electrician',  850, 650, 1150, 160),
  ('plumber',      800, 600, 1100, 140),
  ('tile_worker',  900, 700, 1150,  95),
  ('steel_fixer',  950, 750, 1250,  80),
  ('welder',       900, 700, 1200,  70),
  ('bar_bender',   900, 700, 1200,  40)
) AS v(rle_cd, avg_am, min_am, max_am, smpls_cnt)
JOIN nirmaan.rle_lst_t r ON r.rle_cd = v.rle_cd
ON CONFLICT (rle_id) DO UPDATE
  SET avg_am = EXCLUDED.avg_am, min_am = EXCLUDED.min_am,
      max_am = EXCLUDED.max_am, smpls_cnt = EXCLUDED.smpls_cnt, u_ts = now();
