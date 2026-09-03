-- ════════════════════════════════════════════════════════════════════════
-- 021 — Central file stores. ALL uploaded files live in exactly two tables:
--   • document_lst_t — PDFs / non-image documents (KYC proofs, certificates…)
--   • image_lst_t    — images (selfies, photos, avatars, product shots…)
-- Every other module references a file by id and never stores file bytes of its
-- own. The mapping (who + what it's for) lives here via usr_id + purpose_cd
-- (+ optional ref_tx pointing at the owning entity).
-- Files are held as data-URLs in *_tx for now; swap for object storage in prod.
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

-- PDFs and other (non-image) documents.
CREATE TABLE IF NOT EXISTS nirmaan.document_lst_t (
  doc_id      BIGSERIAL PRIMARY KEY,
  usr_id      BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  purpose_cd  VARCHAR(40) NOT NULL,          -- kyc_pan | kyc_gst | kyc_address | expense_receipt | project_doc …
  ref_tx      VARCHAR(80),                   -- optional owning-entity id (mapping)
  file_nm     VARCHAR(200),
  mime_tx     VARCHAR(100),
  data_tx     TEXT NOT NULL,                 -- data-URL (base64) — swap for object storage in prod
  size_bytes  BIGINT,
  sts_cd      VARCHAR(20) NOT NULL DEFAULT 'uploaded',   -- uploaded | approved | rejected
  a_in        SMALLINT NOT NULL DEFAULT 1,
  i_ts        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_document_usr ON nirmaan.document_lst_t (usr_id, purpose_cd, i_ts DESC);

-- Images.
CREATE TABLE IF NOT EXISTS nirmaan.image_lst_t (
  img_id      BIGSERIAL PRIMARY KEY,
  usr_id      BIGINT NOT NULL REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  purpose_cd  VARCHAR(40) NOT NULL,          -- avatar | kyc_aadhaar | kyc_selfie | worker_photo | project_photo …
  ref_tx      VARCHAR(80),
  file_nm     VARCHAR(200),
  mime_tx     VARCHAR(100),
  data_tx     TEXT NOT NULL,
  size_bytes  BIGINT,
  sts_cd      VARCHAR(20) NOT NULL DEFAULT 'uploaded',
  a_in        SMALLINT NOT NULL DEFAULT 1,
  i_ts        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_image_usr ON nirmaan.image_lst_t (usr_id, purpose_cd, i_ts DESC);
