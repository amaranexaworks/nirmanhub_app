# ANRIX Construction Network

India's largest construction ecosystem — an Ionic React + TypeScript mobile app connecting every stakeholder across hiring, jobs, materials, equipment, property, and project management.

> 📐 **Product & UX blueprint:** see [`docs/`](./docs/README.md) — strategy, architecture, sitemap, flows, wireframes, design system, and UI/UX recommendations.

## Stack

Ionic React 8 · React 18 · TypeScript (strict) · Vite · Capacitor 6 · TanStack Query · Zustand · React Hook Form + Zod · i18next.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # tsc --noEmit
npm run lint
npm run build        # production web build → dist/
```

Add native platforms (after `npm run build`):

```bash
npx cap add ios
npx cap add android
npx cap sync
```

## What's scaffolded

- **Role spine** — 20 roles → 5 archetypes (`src/types/roles.ts`). Roles are runtime config; `useRoleContext()` derives the tab bar, dashboard, and capabilities.
- **Role-aware shell** — `src/app/routing/AppShell.tsx` renders a different bottom-tab bar per archetype; each tab keeps its own nav stack.
- **5 dashboards** — `src/features/dashboards/` (Seeker, Worker, Expert, Orchestrator, Vendor).
- **Design system** — tokens in `src/design-system/tokens/`, runtime CSS variables + dark mode in `src/design-system/theme/`, patterns (StatCard, EmptyState, SectionHeader).
- **Onboarding** — pick role(s) → enter app (`src/features/onboarding/`). Stands in for the full phone-OTP flow.
- **Multi-role switching** — `RoleSwitcher` swaps the whole shell without re-login.
- **Providers** — React Query (server state), Theme (light/dark/system), i18n.

## Folder structure

Feature-first. See [`docs/06-folder-component-architecture.md`](./docs/06-folder-component-architecture.md). Each `features/<name>/` is self-contained (`pages/ components/ hooks/ api/ index.ts`) and may only import another feature via its `index.ts` (enforced by ESLint).

```
src/
├── app/            shell, providers, routing (guards, tab configs)
├── design-system/  tokens, theme (light/dark), primitives, patterns
├── components/     shared composites (layout, search, map, media, data)
├── features/       business modules (hiring, jobs, materials, sites, wallet…)
├── services/       api, realtime, location, payments, media, push, storage, ai
├── stores/         Zustand (auth, ui)
├── types/          shared types + role model
└── i18n/           locales (en, hi, …)
```

## Build order (next)

Phase 0 loop first: hiring → jobs → availability → messaging → wallet → reviews. See [`docs/01-product-strategy.md`](./docs/01-product-strategy.md) §7.
