# RBAC & DB-Driven Menus

This is the heart of the requirement: **roles, archetypes, capabilities,
departments, tabs and the side-menu all live in the database.** The frontend's
old constants (`src/types/roles.ts`, `src/app/routing/tabConfigs.ts`,
`src/app/routing/AppMenu.tsx`) are replaced by the tables and endpoints below.

## Concept map

```
archetype (6)  ──<  role (~60)                  each role belongs to ONE archetype
archetype      ──<  capability (M:N)            capabilities gate features/routes
department (8) ──<  designation (13)            internal org structure (staff logins)

user  ──<  role        (usr_rle_rel_t)          "roles mapping / assign"; one is active
user  ──<  department  (usr_dprtmnt_rel_t)      "departments mapping"

archetype  ──<  tab menu item   (archtyp_mnu_itm_rel_t)   bottom tab bar, ordered
drawer menu item  ──<  archetype (mnu_itm_archtyp_rel_t)  drawer visibility gating
```

The user's **active role → archetype** drives the entire shell. Switch role →
different tabs, drawer, and capabilities, with zero client config.

## Tables

| Table | Holds |
|-------|-------|
| `archtyp_lst_t` | the 6 archetypes (seeker, worker, expert, orchestrator, vendor, financier) |
| `rle_lst_t` | ~60 fine-grained roles, each `→ archtyp_id` |
| `cpblty_lst_t` | capability catalog (browse_marketplace, hire_workers, run_payroll, …) |
| `archtyp_cpblty_rel_t` | which capabilities each archetype grants |
| `dprtmnt_lst_t` / `dsgntn_lst_t` | departments & designations |
| `usr_rle_rel_t` | user↔role assignments (`prmry_in` marks the primary) |
| `usr_dprtmnt_rel_t` | user↔department assignments |
| `mnu_itm_lst_t` | every menu entry — tabs AND drawer items (`mnu_type_cd`) |
| `archtyp_mnu_itm_rel_t` | archetype→tab mapping (ordered; `lbl_ovrd_tx` for per-archetype labels) |
| `mnu_itm_archtyp_rel_t` | drawer-item gating (no rows ⇒ visible to everyone) |

## How navigation is served

`GET /api/nav/menu` (authenticated):

1. Read `req.user.activeRole.archtyp_id`.
2. **Tabs** — `archtyp_mnu_itm_rel_t ⋈ mnu_itm_lst_t` for that archetype, ordered
   by `sqnce_id`. `lbl_ovrd_tx` overrides the default label (e.g. financier's
   `applications` tab shows **"Loans"**, `messages` shows **"Chats"**).
3. **Drawer** — all `mnu_type_cd='drawer'` items, included when they have **no**
   gating rows (global) OR a gating row matches the archetype. Example:
   **"Workforce Management"** is gated to `orchestrator`, so only builders/
   contractors see it.
4. Response:
   ```jsonc
   { "archetype": "orchestrator",
     "tabs":   [ { "key":"home","label":"Home","route":"/app/home","emphasized":false }, … ],
     "drawer": { "sections": [ { "name":"GENERAL", "items":[ … ] } ] } }
   ```

## How the config catalog is served

`GET /api/rbac/bootstrap` returns the whole DB-owned config the client hydrates at
startup (replaces `roles.ts`):
```jsonc
{ "archetypes": [...], "roles": [...], "capabilities": [...],
  "archetypeCapabilities": { "orchestrator": ["hire_workers","run_payroll", …], … },
  "departments": [ { "dprtmnt_nm":"Operations", "designations":[…] }, … ] }
```
Granular reads also exist: `/rbac/archetypes`, `/rbac/roles?archetype=worker`,
`/rbac/capabilities`, `/rbac/departments`.

## Assigning roles & departments

```
POST   /api/rbac/users/:userId/roles          { "rle_id": 43, "prmry_in": false }
DELETE /api/rbac/users/:userId/roles/:rleId
POST   /api/rbac/users/:userId/departments    { "dprtmnt_id": 1, "dsgntn_id": 1, "prmry_in": true }
```
A user's **active role** is changed with `POST /api/auth/switch-role { rle_id }`,
which also re-mints the JWT with the new archetype's capabilities.

## Changing menus/roles without a deploy

Because it's all data, editing navigation or roles is an `INSERT`/`UPDATE`:

```sql
-- Add a "Contracts" drawer item, visible only to orchestrators
INSERT INTO nirmaan.mnu_itm_lst_t (mnu_itm_cd, mnu_itm_nm, icn_tx, url_tx, mnu_type_cd, sctn_nm, sqnce_id)
VALUES ('contracts','Contracts','document-lock-outline','/app/contracts','drawer','GENERAL', 9);

INSERT INTO nirmaan.mnu_itm_archtyp_rel_t (mnu_itm_id, archtyp_id)
SELECT m.mnu_itm_id, a.archtyp_id
FROM nirmaan.mnu_itm_lst_t m, nirmaan.archtyp_lst_t a
WHERE m.mnu_itm_cd='contracts' AND m.mnu_type_cd='drawer' AND a.archtyp_cd='orchestrator';
```
Prefer adding these as new **seed** statements (idempotent `ON CONFLICT`) so they're
reproducible across environments.
