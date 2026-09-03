-- ════════════════════════════════════════════════════════════════════════
-- 032 — Move file bytes OUT of the database and onto disk.
-- New uploads are written to  <UPLOAD_DIR>/YYYY/MM/<uuid>.<ext>  and only the
-- RELATIVE path is stored here (stor_path_tx). The legacy data-URL column
-- (data_tx) is kept but made nullable so old rows still serve; new rows leave
-- it NULL. The raw-serve endpoint prefers the disk path and falls back to
-- data_tx for pre-migration rows.
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

-- Relative storage path (e.g. '2026/07/ab12-….jpg'); NULL for legacy base64 rows.
ALTER TABLE nirmaan.document_lst_t ADD COLUMN IF NOT EXISTS stor_path_tx TEXT;
ALTER TABLE nirmaan.image_lst_t    ADD COLUMN IF NOT EXISTS stor_path_tx TEXT;

-- Bytes no longer required inline — a row is valid with EITHER a disk path OR data_tx.
ALTER TABLE nirmaan.document_lst_t ALTER COLUMN data_tx DROP NOT NULL;
ALTER TABLE nirmaan.image_lst_t    ALTER COLUMN data_tx DROP NOT NULL;
