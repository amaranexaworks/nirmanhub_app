-- 022 — Workforce identity codes: Builder → Supervisor → Employee(labour) hierarchy
-- with auto-generated, human-readable codes assigned by BEFORE INSERT triggers.
--
--   Builder    : BLD-0001                one per orchestrator user (project owner)
--   Supervisor : BLD-0001-S01            numbered within the builder (across all their projects)
--   Employee   : BLD-0001-S01-E001       numbered within the supervisor
--                BLD-0001-E001           (fallback) numbered within the builder when a
--                                        worker has no supervisor yet
--
-- Every supervisor is mapped to its builder (bldr_id) and every worker is mapped to
-- both its builder (bldr_id) and supervisor (suprvsr_id, already existed). Counters
-- live on the parent row (sup_seq_no / emp_seq_no) and are bumped under a row lock so
-- concurrent inserts never collide.
SET search_path TO nirmaan, public;

-- ── Builder registry (one row per builder-user) ──────────────────────────────
CREATE SEQUENCE IF NOT EXISTS nirmaan.wf_bldr_cd_seq START 1;

CREATE TABLE IF NOT EXISTS nirmaan.wf_bldr_lst_t (
  bldr_id    BIGSERIAL PRIMARY KEY,
  usr_id     BIGINT      NOT NULL UNIQUE REFERENCES nirmaan.usr_lst_t(usr_id) ON DELETE CASCADE,
  bldr_cd    VARCHAR(20) NOT NULL UNIQUE,     -- BLD-0001
  sup_seq_no INT         NOT NULL DEFAULT 0,  -- running supervisor counter for this builder
  emp_seq_no INT         NOT NULL DEFAULT 0,  -- running counter for supervisor-less employees
  i_ts       TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_in       SMALLINT    NOT NULL DEFAULT 1
);

-- ── Code + mapping columns on the existing tables ────────────────────────────
ALTER TABLE nirmaan.wf_suprvsr_lst_t
  ADD COLUMN IF NOT EXISTS bldr_id    BIGINT      REFERENCES nirmaan.wf_bldr_lst_t(bldr_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suprvsr_cd VARCHAR(30),                 -- BLD-0001-S01
  ADD COLUMN IF NOT EXISTS emp_seq_no INT NOT NULL DEFAULT 0;      -- running employee counter for this supervisor

ALTER TABLE nirmaan.wf_workr_lst_t
  ADD COLUMN IF NOT EXISTS bldr_id BIGINT   REFERENCES nirmaan.wf_bldr_lst_t(bldr_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS emp_cd  VARCHAR(40);                    -- BLD-0001-S01-E001

CREATE UNIQUE INDEX IF NOT EXISTS uq_wf_suprvsr_cd   ON nirmaan.wf_suprvsr_lst_t (suprvsr_cd);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wf_workr_emp_cd ON nirmaan.wf_workr_lst_t (emp_cd);
CREATE INDEX        IF NOT EXISTS idx_wf_suprvsr_bldr ON nirmaan.wf_suprvsr_lst_t (bldr_id);
CREATE INDEX        IF NOT EXISTS idx_wf_workr_bldr   ON nirmaan.wf_workr_lst_t (bldr_id);

-- ── Helper: ensure a builder row (+ code) exists for a user; return its id ────
CREATE OR REPLACE FUNCTION nirmaan.wf_ensure_bldr(p_usr_id BIGINT) RETURNS BIGINT AS $$
DECLARE v_bldr BIGINT;
BEGIN
  SELECT bldr_id INTO v_bldr FROM nirmaan.wf_bldr_lst_t WHERE usr_id = p_usr_id;
  IF v_bldr IS NOT NULL THEN RETURN v_bldr; END IF;

  INSERT INTO nirmaan.wf_bldr_lst_t (usr_id, bldr_cd)
    VALUES (p_usr_id, 'BLD-' || lpad(nextval('nirmaan.wf_bldr_cd_seq')::text, 4, '0'))
    ON CONFLICT (usr_id) DO NOTHING
    RETURNING bldr_id INTO v_bldr;

  IF v_bldr IS NULL THEN   -- lost the race; read the row the other txn inserted
    SELECT bldr_id INTO v_bldr FROM nirmaan.wf_bldr_lst_t WHERE usr_id = p_usr_id;
  END IF;
  RETURN v_bldr;
END $$ LANGUAGE plpgsql;

-- ── Backfill existing data so nothing is left without a code ──────────────────
DO $$
DECLARE
  r      RECORD;
  v_bldr BIGINT;
  v_seq  INT;
  v_bcd  TEXT;
  v_scd  TEXT;
BEGIN
  -- 1) a builder row for every project owner that has any supervisor or worker
  FOR r IN
    SELECT DISTINCT p.ownr_usr_id AS usr_id
    FROM nirmaan.wf_prjct_lst_t p
    WHERE EXISTS (SELECT 1 FROM nirmaan.wf_suprvsr_lst_t s WHERE s.prjct_id = p.prjct_id)
       OR EXISTS (SELECT 1 FROM nirmaan.wf_workr_lst_t   w WHERE w.prjct_id = p.prjct_id)
  LOOP
    PERFORM nirmaan.wf_ensure_bldr(r.usr_id);
  END LOOP;

  -- 2) supervisors → bldr_id + suprvsr_cd, numbered in stable id order per builder
  FOR r IN
    SELECT s.suprvsr_id, p.ownr_usr_id
    FROM nirmaan.wf_suprvsr_lst_t s
    JOIN nirmaan.wf_prjct_lst_t p ON p.prjct_id = s.prjct_id
    WHERE s.suprvsr_cd IS NULL
    ORDER BY p.ownr_usr_id, s.suprvsr_id
  LOOP
    v_bldr := nirmaan.wf_ensure_bldr(r.ownr_usr_id);
    UPDATE nirmaan.wf_bldr_lst_t SET sup_seq_no = sup_seq_no + 1
      WHERE bldr_id = v_bldr RETURNING sup_seq_no, bldr_cd INTO v_seq, v_bcd;
    UPDATE nirmaan.wf_suprvsr_lst_t
      SET bldr_id = v_bldr, suprvsr_cd = v_bcd || '-S' || lpad(v_seq::text, 2, '0')
      WHERE suprvsr_id = r.suprvsr_id;
  END LOOP;

  -- 3) workers → bldr_id + emp_cd, numbered per supervisor (or per builder if none)
  FOR r IN
    SELECT w.workr_id, w.suprvsr_id, p.ownr_usr_id
    FROM nirmaan.wf_workr_lst_t w
    JOIN nirmaan.wf_prjct_lst_t p ON p.prjct_id = w.prjct_id
    WHERE w.emp_cd IS NULL
    ORDER BY p.ownr_usr_id, w.workr_id
  LOOP
    v_bldr := nirmaan.wf_ensure_bldr(r.ownr_usr_id);
    IF r.suprvsr_id IS NOT NULL THEN
      UPDATE nirmaan.wf_suprvsr_lst_t SET emp_seq_no = emp_seq_no + 1
        WHERE suprvsr_id = r.suprvsr_id RETURNING emp_seq_no, suprvsr_cd INTO v_seq, v_scd;
      UPDATE nirmaan.wf_workr_lst_t
        SET bldr_id = v_bldr, emp_cd = v_scd || '-E' || lpad(v_seq::text, 3, '0')
        WHERE workr_id = r.workr_id;
    ELSE
      UPDATE nirmaan.wf_bldr_lst_t SET emp_seq_no = emp_seq_no + 1
        WHERE bldr_id = v_bldr RETURNING emp_seq_no, bldr_cd INTO v_seq, v_bcd;
      UPDATE nirmaan.wf_workr_lst_t
        SET bldr_id = v_bldr, emp_cd = v_bcd || '-E' || lpad(v_seq::text, 3, '0')
        WHERE workr_id = r.workr_id;
    END IF;
  END LOOP;
END $$;

-- ── Trigger: assign supervisor code on insert ────────────────────────────────
CREATE OR REPLACE FUNCTION nirmaan.wf_suprvsr_biu() RETURNS trigger AS $$
DECLARE v_ownr BIGINT; v_bldr BIGINT; v_seq INT; v_bcd TEXT;
BEGIN
  IF NEW.suprvsr_cd IS NOT NULL THEN RETURN NEW; END IF;   -- respect an explicit code
  SELECT ownr_usr_id INTO v_ownr FROM nirmaan.wf_prjct_lst_t WHERE prjct_id = NEW.prjct_id;
  IF v_ownr IS NULL THEN RETURN NEW; END IF;

  v_bldr := nirmaan.wf_ensure_bldr(v_ownr);
  UPDATE nirmaan.wf_bldr_lst_t SET sup_seq_no = sup_seq_no + 1
    WHERE bldr_id = v_bldr RETURNING sup_seq_no, bldr_cd INTO v_seq, v_bcd;

  NEW.bldr_id    := v_bldr;
  NEW.suprvsr_cd := v_bcd || '-S' || lpad(v_seq::text, 2, '0');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wf_suprvsr_biu ON nirmaan.wf_suprvsr_lst_t;
CREATE TRIGGER trg_wf_suprvsr_biu BEFORE INSERT ON nirmaan.wf_suprvsr_lst_t
  FOR EACH ROW EXECUTE FUNCTION nirmaan.wf_suprvsr_biu();

-- ── Trigger: assign employee code on insert ──────────────────────────────────
CREATE OR REPLACE FUNCTION nirmaan.wf_workr_biu() RETURNS trigger AS $$
DECLARE v_ownr BIGINT; v_bldr BIGINT; v_seq INT; v_bcd TEXT; v_scd TEXT;
BEGIN
  IF NEW.emp_cd IS NOT NULL THEN RETURN NEW; END IF;       -- respect an explicit code
  SELECT ownr_usr_id INTO v_ownr FROM nirmaan.wf_prjct_lst_t WHERE prjct_id = NEW.prjct_id;
  IF v_ownr IS NULL THEN RETURN NEW; END IF;

  v_bldr      := nirmaan.wf_ensure_bldr(v_ownr);
  NEW.bldr_id := v_bldr;

  IF NEW.suprvsr_id IS NOT NULL THEN
    UPDATE nirmaan.wf_suprvsr_lst_t SET emp_seq_no = emp_seq_no + 1
      WHERE suprvsr_id = NEW.suprvsr_id RETURNING emp_seq_no, suprvsr_cd INTO v_seq, v_scd;
    IF v_scd IS NOT NULL THEN
      NEW.emp_cd := v_scd || '-E' || lpad(v_seq::text, 3, '0');
      RETURN NEW;
    END IF;
  END IF;

  -- no supervisor (or supervisor without a code) → number under the builder
  UPDATE nirmaan.wf_bldr_lst_t SET emp_seq_no = emp_seq_no + 1
    WHERE bldr_id = v_bldr RETURNING emp_seq_no, bldr_cd INTO v_seq, v_bcd;
  NEW.emp_cd := v_bcd || '-E' || lpad(v_seq::text, 3, '0');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wf_workr_biu ON nirmaan.wf_workr_lst_t;
CREATE TRIGGER trg_wf_workr_biu BEFORE INSERT ON nirmaan.wf_workr_lst_t
  FOR EACH ROW EXECUTE FUNCTION nirmaan.wf_workr_biu();
