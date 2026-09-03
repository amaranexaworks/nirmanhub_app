---
name: backend-conventions
description: Conventions for the Nirmaan backend (Express + TS + Postgres, JWT+session, DB-driven RBAC/menus). Use when writing or reviewing any code under backend/ — models, controllers, routes, SQL, auth, or migrations.
---

# Nirmaan Backend Conventions

Follow these exactly — they mirror the WMS-web server the backend is modeled on.

## Layout & naming
- Modules live in `api/modules/<name>/{controllers,models,routes,services,validators}`.
- Files: `XxxCtrl.ts` (controller), `XxxMdl.ts` (model), `XxxService.ts` (service),
  `<name>.routes.ts` (router).
- Shared code is required via the global app root:
  `require((global as any).appRoot + '/utils/dflower.utils')`. Do **not** use deep
  relative `../../../` paths for config/utils.

## Controllers (`*Ctrl.ts`)
- Start each handler with `const fnm = '<handlerName>';`.
- Read input as `const data = req.body.data || req.body;`.
- Validate with `validate.validate_input_params(data, rules, cb)` before hitting a model.
- Return **only** via the envelope helpers:
  - success: `df.formatSucessRes(req, res, data, cntxtDtls, fnm, { success_msg, success_status, meta })`
  - error: `df.formatErrorRes(res, errors, cntxtDtls, fnm, { error_status, err_message })`
- Never leak DB columns like `pwd_tx`; shape a public object.

## Models (`*Mdl.ts`)
- One exported function per query, named `<verb><Noun>Mdl`.
- **Always parameterize** — build SQL with `$1,$2,…` and pass values as an array to
  `dbutil.execQuery(sqldb.AppPool, QRY, [params], cntxtDtls, req)`. Never string-
  interpolate user input.
- Reference tables schema-qualified: `${schema}.usr_lst_t` (`schema = sqldb.schema`).
- Return `rows` (execQuery already unwraps). Controllers pick `[0]` when they expect one.

## Routes (`<name>.routes.ts`)
- `const router = express.Router();` … `module.exports = router;`.
- Protect with `AuthService.authenticate`; gate with `AuthService.authorize('<capability>')`.
- Mount the router in `api/routes/apiRoutes.ts` under `/<name>`.

## Auth
- Capability-based. Capabilities come from the active role's archetype
  (`archtyp_cpblty_rel_t`) and ride in the JWT. To require one:
  `router.post('/', auth, AuthService.authorize('post_project'), Ctrl.createCtrl)`.

## Database
- Naming: `_lst_t` master, `_rel_t` mapping, `_dtl_t` detail; `_id/_cd/_nm/_tx/_in/_ts/_am`.
- Soft-delete via `a_in = 0`; filter `WHERE a_in = 1` on reads.
- Schema changes = a **new** migration in `db/migrations/NNN_*.sql` (never edit an
  applied one). Catalog/config data = idempotent seed in `db/seeds/` (`ON CONFLICT`).
- Nothing user-facing is hardcoded — menus, roles, capabilities, departments, and
  catalogs are DB rows. Add data, not constants.

## Response envelope (must match)
```json
{ "status": 200, "success": true, "message": "…", "data": <payload>, "meta": {…} }
```

## Before you finish
- `npx tsc --noEmit` passes.
- New tables have a migration; new catalog data has a seed.
- New routes are mounted and protected; capability guards added where writes need them.
