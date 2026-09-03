-- 035 — Flats/units inventory + sales lifecycle, per-unit & staged project
--        documents, and worker site-assignment (multi-site shift) history.
--        Mirrors the app's workforceStore units + document features.
SET search_path TO nirmaan, public;

-- ── Flats / units (floor × flat) with sale + registration state ──
CREATE TABLE IF NOT EXISTS nirmaan.wf_unit_lst_t (
  unit_id        BIGSERIAL PRIMARY KEY,
  prjct_id       BIGINT NOT NULL REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE CASCADE,
  floor_no       INT NOT NULL DEFAULT 0,
  flat_no_tx     VARCHAR(40) NOT NULL,
  unit_type_tx   VARCHAR(40),                        -- 1BHK | 2BHK | 3BHK | shop…
  area_sqft      NUMERIC(10,2),
  price_am       NUMERIC(14,2),
  sts_cd         VARCHAR(16) NOT NULL DEFAULT 'available', -- available|blocked|booked|sold|registered
  buyer_nm_tx    VARCHAR(160),
  buyer_phone_tx VARCHAR(20),
  amt_rcvd_am    NUMERIC(14,2),
  booked_dt      DATE,
  sold_dt        DATE,
  regd_dt        DATE,
  notes_tx       TEXT,
  i_ts           TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in           SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_wf_unit_prjct ON nirmaan.wf_unit_lst_t (prjct_id);

-- ── Per-flat documents (allotment, agreement, sale deed, registration, possession) ──
CREATE TABLE IF NOT EXISTS nirmaan.wf_unit_doc_lst_t (
  doc_id   BIGSERIAL PRIMARY KEY,
  unit_id  BIGINT NOT NULL REFERENCES nirmaan.wf_unit_lst_t(unit_id) ON DELETE CASCADE,
  nm_tx    VARCHAR(200) NOT NULL,
  kind_cd  VARCHAR(30),                              -- allotment|agreement|sale-deed|registration|possession|other
  url_tx   TEXT,
  i_ts     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wf_unit_doc_unit ON nirmaan.wf_unit_doc_lst_t (unit_id);

-- ── Staged project documents (permission → construction → completion → sales) ──
CREATE TABLE IF NOT EXISTS nirmaan.wf_prjct_doc_lst_t (
  doc_id     BIGSERIAL PRIMARY KEY,
  prjct_id   BIGINT NOT NULL REFERENCES nirmaan.wf_prjct_lst_t(prjct_id) ON DELETE CASCADE,
  stage_cd   VARCHAR(20) NOT NULL,                   -- approvals | construction | completion | sales
  kind_cd    VARCHAR(60),                            -- rera | plan-sanction | commencement | oc | cc | noc-fire | title | other
  nm_tx      VARCHAR(200) NOT NULL,
  url_tx     TEXT,
  issued_dt  DATE,
  i_ts       TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in       SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_wf_prjct_doc_prjct ON nirmaan.wf_prjct_doc_lst_t (prjct_id, stage_cd);

-- ── Worker site-assignment (shift) history — audit of multi-site moves ──
CREATE TABLE IF NOT EXISTS nirmaan.wf_asgnmnt_hstry_t (
  asgnmnt_id     BIGSERIAL PRIMARY KEY,
  workr_id       BIGINT NOT NULL REFERENCES nirmaan.wf_workr_lst_t(workr_id) ON DELETE CASCADE,
  from_prjct_id  BIGINT,
  to_prjct_id    BIGINT NOT NULL,
  moved_by_usr_id BIGINT REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE SET NULL,
  i_ts           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wf_asgnmnt_workr ON nirmaan.wf_asgnmnt_hstry_t (workr_id);
