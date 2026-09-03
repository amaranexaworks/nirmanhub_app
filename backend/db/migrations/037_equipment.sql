-- 037 — Equipment rental: owners list machinery for rent; site owners/contractors
-- rent it by the day, optionally billed to a site (like material orders, 036).
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.equip_lst_t (
  equip_id     BIGSERIAL PRIMARY KEY,
  ownr_usr_id  BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL,
  nm_tx        VARCHAR(160) NOT NULL,
  ctgry_tx     VARCHAR(60),                          -- excavator|mixer|scaffolding|crane|compactor|other
  dly_rate_am  NUMERIC(12,2),                        -- rate per day
  lctn_tx      VARCHAR(160),
  img_url_tx   TEXT,
  dscn_tx      TEXT,
  sts_cd       VARCHAR(16) NOT NULL DEFAULT 'available', -- available|rented
  i_ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in         SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_equip_ctgry ON nirmaan.equip_lst_t (ctgry_tx);

CREATE TABLE IF NOT EXISTS nirmaan.equip_rental_t (
  rental_id    BIGSERIAL PRIMARY KEY,
  equip_id     BIGINT REFERENCES nirmaan.equip_lst_t(equip_id) ON DELETE CASCADE,
  rentr_usr_id BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL,
  prjct_id     BIGINT REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE SET NULL, -- optional site
  from_dt      DATE,
  days_cnt     INT NOT NULL DEFAULT 1,
  ttl_am       NUMERIC(12,2),
  sts_cd       VARCHAR(16) NOT NULL DEFAULT 'requested', -- requested|confirmed|returned|cancelled
  i_ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in         SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_equip_rental_rentr ON nirmaan.equip_rental_t (rentr_usr_id);

-- Seed a starter catalogue (idempotent by name).
INSERT INTO nirmaan.equip_lst_t (nm_tx, ctgry_tx, dly_rate_am, lctn_tx, dscn_tx)
SELECT v.nm, v.ct, v.rate, v.loc, v.dsc
FROM (VALUES
  ('JCB 3DX Backhoe Loader', 'excavator', 9500, 'Chennai', 'Digging, loading and trenching. Operator available.'),
  ('Concrete Mixer (10/7)', 'mixer', 1200, 'Hyderabad', 'Half-bag tilting drum mixer for on-site concrete.'),
  ('Scaffolding Set (100 sqm)', 'scaffolding', 800, 'Bengaluru', 'Cuplock scaffolding with planks and jacks.'),
  ('Tower Crane (Potain)', 'crane', 22000, 'Mumbai', 'Up to 60m reach. Ideal for mid-rise construction.'),
  ('Plate Compactor', 'compactor', 900, 'Pune', 'Soil and paver compaction, petrol.'),
  ('Concrete Vibrator', 'other', 450, 'Chennai', 'Needle vibrator for slab and column pours.')
) AS v(nm, ct, rate, loc, dsc)
WHERE NOT EXISTS (SELECT 1 FROM nirmaan.equip_lst_t e WHERE e.nm_tx = v.nm);
