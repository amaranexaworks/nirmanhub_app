-- ════════════════════════════════════════════════════════════════════════
-- 004 — Navigation: bottom tabs + side-menu (drawer), fully DB-driven.
-- ════════════════════════════════════════════════════════════════════════
-- Replaces the hardcoded tabConfigs.ts + AppMenu.tsx.
--
--   mnu_itm_lst_t          every menu entry (tabs AND drawer items)
--   archtyp_mnu_itm_rel_t  which items are TABS for an archetype (ordered)
--   mnu_itm_archtyp_rel_t  which archetypes may SEE a drawer item
--                          (a drawer item with NO rows here is global/visible to all)
--
-- The navigation service resolves: user.actv_rle_id → archetype → this mapping,
-- so switching role re-shapes the whole shell without any client-side config.
SET search_path TO nirmaan, public;

CREATE TABLE IF NOT EXISTS nirmaan.mnu_itm_lst_t (
  mnu_itm_id       SERIAL PRIMARY KEY,
  mnu_itm_cd       VARCHAR(60) NOT NULL,          -- route key: home | discover | wallet ...
  mnu_itm_nm       VARCHAR(120) NOT NULL,         -- fallback label
  lbl_key_tx       VARCHAR(120),                  -- i18n key e.g. tabs.home
  icn_tx           VARCHAR(80),                   -- ionicon name
  url_tx           VARCHAR(200) NOT NULL,         -- route e.g. /app/home
  mnu_type_cd      VARCHAR(20) NOT NULL,          -- tab | drawer
  sctn_nm          VARCHAR(60),                   -- drawer grouping e.g. GENERAL
  prnt_mnu_itm_id  INT NOT NULL DEFAULT 0,        -- 0 = root
  emphss_in        SMALLINT NOT NULL DEFAULT 0,   -- 1 = emphasized center FAB
  sqnce_id         INT NOT NULL DEFAULT 0,
  a_in             SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (mnu_itm_cd, mnu_type_cd)
);
CREATE INDEX IF NOT EXISTS idx_mnu_type ON nirmaan.mnu_itm_lst_t (mnu_type_cd);

-- Bottom-tab mapping: which items appear (and in what order) per archetype.
CREATE TABLE IF NOT EXISTS nirmaan.archtyp_mnu_itm_rel_t (
  id          SERIAL PRIMARY KEY,
  archtyp_id  INT NOT NULL REFERENCES nirmaan.archtyp_lst_t(archtyp_id) ON DELETE CASCADE,
  mnu_itm_id  INT NOT NULL REFERENCES nirmaan.mnu_itm_lst_t(mnu_itm_id) ON DELETE CASCADE,
  lbl_ovrd_tx VARCHAR(120),                    -- per-archetype label override (e.g. financier "Loans"/"Chats")
  sqnce_id    INT NOT NULL DEFAULT 0,
  a_in        SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (archtyp_id, mnu_itm_id)
);
CREATE INDEX IF NOT EXISTS idx_archtyp_mnu ON nirmaan.archtyp_mnu_itm_rel_t (archtyp_id, sqnce_id);

-- Drawer-item gating: restrict a drawer item to specific archetypes.
-- If a drawer item has zero rows here, it is visible to every logged-in user.
CREATE TABLE IF NOT EXISTS nirmaan.mnu_itm_archtyp_rel_t (
  id          SERIAL PRIMARY KEY,
  mnu_itm_id  INT NOT NULL REFERENCES nirmaan.mnu_itm_lst_t(mnu_itm_id) ON DELETE CASCADE,
  archtyp_id  INT NOT NULL REFERENCES nirmaan.archtyp_lst_t(archtyp_id) ON DELETE CASCADE,
  a_in        SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (mnu_itm_id, archtyp_id)
);
