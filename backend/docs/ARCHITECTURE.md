# Architecture

The backend follows the **WMS-web server** architecture: Express + TypeScript,
PostgreSQL via `pg` pools, `express-session` (persisted in Postgres) + RS256 JWT,
and a strict per-module layout. Everything the UI renders is data, not code.

## Layers

```
Request
  │
  ▼
nodeapp.ts ── helmet → cors → compression → body-parser → cookie-parser → session(pg)
  │
  ▼
api/routes/apiRoutes.ts        aggregates every module router under /api
  │
  ▼
api/modules/<name>/routes      per-module Express router
  │   └─ authenticate / authorize(capability) middleware
  ▼
api/modules/<name>/controllers  *Ctrl.ts — HTTP in/out, validation, response envelope
  │
  ▼
api/modules/<name>/services     *Service.ts — business logic (auth only, so far)
  │
  ▼
api/modules/<name>/models       *Mdl.ts — parameterized SQL via dbutil.execQuery
  │
  ▼
config/db.config (pg.Pool) ──▶ PostgreSQL (schema: nirmaan)
```

## Directory map

```
backend/
├── nodeapp.ts                 app bootstrap (middleware order, listen)
├── config/                    loadEnv, db.config, session.config, cors.config
├── security/                  RS256 key pair (git-ignored; `npm run keys`)
├── initialize/                startup checks + session middleware builder
├── utils/                     dflower (response envelope), pg.db.utils (execQuery), json, validate
├── db/
│   ├── migrations/            *.sql, applied in filename order (tracked in _migrations_t)
│   ├── seeds/                 *.sql, idempotent (ON CONFLICT), re-runnable
│   └── run.ts                 migrate | seed | reset runner
├── api/
│   ├── routes/apiRoutes.ts    mounts all module routers
│   └── modules/<name>/
│       ├── controllers/  *Ctrl.ts
│       ├── models/       *Mdl.ts
│       ├── services/     *Service.ts   (optional)
│       ├── routes/       <name>.routes.ts
│       └── validators/   (optional)
└── docs/                      this documentation
```

## Conventions

**File naming** — `XxxCtrl.ts` (controllers), `XxxMdl.ts` (models),
`XxxService.ts` (services), `<name>.routes.ts` (routers).

**Module wiring** — files reference shared code through the global app root:
`require((global as any).appRoot + '/utils/...')`. `global.appRoot` is set once in
`nodeapp.ts` (and in `db/run.ts` for CLI tasks).

**Response envelope** — every controller returns via `df.formatSucessRes` /
`df.formatErrorRes`, so all responses share one shape:
```json
{ "status": 200, "success": true, "message": "...", "data": <payload>, "meta": {…} }
```

**Data access** — models never interpolate user input into SQL. They build a
parameterized query (`$1, $2 …`) and call
`dbutil.execQuery(pool, sql, params, ctx, req)` which returns `rows`.

**Auth** — `AuthenticationService.authenticate` guards protected routes;
`AuthenticationService.authorize('<capability>')` enforces capability-based access.
See [AUTH.md](AUTH.md).

**Everything from the DB** — no menu, role, capability, department, or catalog is
hardcoded. The frontend's old `roles.ts` / `tabConfigs.ts` / `AppMenu.tsx` are now
DB tables served by the `rbac` and `navigation` modules. See
[RBAC-AND-MENUS.md](RBAC-AND-MENUS.md).

## Request lifecycle (example: `GET /api/nav/menu`)

1. `apiRoutes` routes `/nav/*` to the navigation router.
2. `authenticate` validates the JWT and (if a DB session exists) checks the token
   matches the one saved at login; sets `req.user` from the token payload.
3. `MenuCtrl.getMenuCtrl` reads `req.user.activeRole.archtyp_id`.
4. `MenuMdl.getTabsMdl` + `getDrawerMdl` query the archetype→menu mappings.
5. The controller shapes tabs + grouped drawer sections and returns the envelope.

## Adding a module
See the `add-backend-module` skill in `.claude/skills/`. In short: copy the
`requirements` module, rename `Mdl`/`Ctrl`/`routes`, add a migration + (optional)
seed, and mount the router in `api/routes/apiRoutes.ts`.
