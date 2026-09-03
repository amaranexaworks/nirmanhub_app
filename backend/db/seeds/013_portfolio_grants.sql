-- 013 — Grant the manage_portfolio capability to the archetypes that maintain a
-- project showcase. Previously only 'expert' had it, but builders/contractors
-- (orchestrator) and workers also showcase completed work on their profile.
-- Idempotent: safe to re-run.
SET search_path TO nirmaan, public;

INSERT INTO nirmaan.archtyp_cpblty_rel_t (archtyp_id, cpblty_id)
SELECT a.archtyp_id, c.cpblty_id
FROM (VALUES
  ('orchestrator', 'manage_portfolio'),
  ('worker',       'manage_portfolio')
) AS v(archtyp_cd, cpblty_cd)
JOIN nirmaan.archtyp_lst_t a ON a.archtyp_cd = v.archtyp_cd
JOIN nirmaan.cpblty_lst_t  c ON c.cpblty_cd  = v.cpblty_cd
ON CONFLICT (archtyp_id, cpblty_id) DO NOTHING;
