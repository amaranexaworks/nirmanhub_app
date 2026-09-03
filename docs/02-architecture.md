# 02 — App Architecture (Principal Frontend Architect)

## 1. Architectural Principles

1. **Feature-first, not layer-first** — code organized by business capability (hiring, jobs, materials), each a self-contained module.
2. **Role as runtime config, not branching code** — one app shell; role + archetype select dashboards, tabs, and feature flags via configuration.
3. **Offline-first** — Indian network reality. Read-from-cache, queue writes, sync on reconnect.
4. **Thin screens, fat hooks/services** — UI components stay dumb; logic lives in hooks and a typed service/data layer.
5. **Contract-driven** — typed API contracts (OpenAPI/Zod) shared between client and server; UI never trusts shapes.
6. **Progressive enhancement** — video calling, AI, voice degrade gracefully on low-end devices.

## 2. High-Level Layered Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ PRESENTATION  Ionic React pages, components, design system     │
│               (role-aware shells, tab bars, dashboards)        │
├──────────────────────────────────────────────────────────────┤
│ INTERACTION   Hooks (useHiring, useJobs, useChat…), routers,   │
│               guards, role/permission resolver, form logic     │
├──────────────────────────────────────────────────────────────┤
│ STATE         Server cache (React Query) + Client/UI store     │
│               (Zustand) + persisted slices (auth, role, draft) │
├──────────────────────────────────────────────────────────────┤
│ DOMAIN/SVC    Typed services: api/, realtime/, payments/,      │
│               location/, ai/, media/, offline-queue/           │
├──────────────────────────────────────────────────────────────┤
│ PLATFORM      Capacitor plugins: Geolocation, Camera, Push,    │
│               Filesystem, Network, SecureStorage, CallKit/WebRTC│
├──────────────────────────────────────────────────────────────┤
│ BACKEND (out of scope here) REST/GraphQL, WebSocket, WebRTC    │
│               SFU, payments PSP, maps, push, object storage     │
└──────────────────────────────────────────────────────────────┘
```

## 3. Recommended Tech Stack (Frontend)

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | **Ionic React 8 + React 18** | Native-feel components, one codebase → iOS/Android/PWA |
| Language | **TypeScript (strict)** | Safety across a large multi-role surface |
| Native bridge | **Capacitor 6** | Geolocation, Camera, Push, secure storage, WebRTC |
| Routing | **React Router (Ionic's `IonReactRouter`)** + `IonTabs`/`IonRouterOutlet` | Native stack + tab semantics, deep links |
| Server state | **TanStack Query (React Query)** | Caching, retries, offline, pagination, optimistic updates |
| Client/UI state | **Zustand** (+ persist middleware) | Lightweight, simple, persistable (auth, active role, drafts) |
| Forms | **React Hook Form + Zod** | Performant, schema-validated, typed |
| Real-time | **Socket.IO / WS client** wrapped in `realtime/` service | Chat, presence, availability, bids |
| Video | **WebRTC via SFU (LiveKit/Agora SDK)** | Scalable group/1:1 calling |
| Maps/Geo | **Capacitor Geolocation + Mapbox/Google Maps SDK** | Nearby discovery, GPS search |
| i18n | **i18next** | Vernacular languages, RTL-safe |
| Animation | **Ionic animations + Framer Motion (where DOM)** | Premium micro-interactions |
| Styling | **CSS variables design tokens + Ionic theming + utility layer** | Themeable, dark mode native |
| Media/Voice | Capacitor Camera/Filesystem + MediaRecorder | Voice messages, portfolio photos |
| Notifications | **Capacitor Push (FCM/APNs)** + in-app inbox | Jobs, bids, chat, payments |
| Testing | Vitest + React Testing Library + Playwright (E2E) | Unit→integration→E2E |
| Tooling | Vite, ESLint, Prettier, Husky, TypeScript path aliases | DX + quality gates |

## 4. State Management Strategy

Split state by **ownership**, not by convenience:

- **Server state** (lists of jobs, workers, orders, chats) → **React Query**. Source of truth = backend; cache + invalidate. Never duplicate into a global store.
- **Session/identity state** (auth tokens, current user, active role, KYC status) → **Zustand persisted** + Capacitor SecureStorage for tokens.
- **UI/ephemeral state** (modals, filters, wizard step, map viewport) → local component state or small Zustand slices.
- **Draft/offline state** (unsent messages, queued bids, attendance marked offline) → persisted Zustand + offline queue, reconciled by sync service.

```
Auth/Role  ── Zustand (persist) ──▶ guards, tab config, dashboard select
Domain data ── React Query ──▶ screens (loading/error/empty states baked in)
Realtime   ── socket → React Query cache updates + Zustand presence
Offline    ── write queue → replay on Network online event
```

## 5. Role & Permission Resolver

A single `useRoleContext()` derives everything role-dependent:

```
user.roles[] ──▶ resolveArchetype() ──▶ {
  archetype: A|B|C|D|E,
  tabs:      TabConfig[],
  dashboard: DashboardTemplateId,
  features:  FeatureFlags,        // bidding, payroll, storefront…
  capabilities: Permission[]      // can_post_job, can_bid, can_list_material…
}
```

- **Multi-role accounts:** a persistent **role switcher** in the header/profile. Switching swaps the entire shell (tabs + dashboard + feature set) without re-login. State is namespaced per active role where needed.
- Route **guards** check capabilities, not roles, so adding a role never rewrites routing.

## 6. Data & API Layer

- `services/api/` — typed clients per domain module (`hiringApi`, `jobsApi`, `materialsApi`…), generated/validated against OpenAPI + Zod.
- All responses validated at the boundary; invalid → typed error, never silent.
- Pagination: cursor-based infinite scroll via React Query `useInfiniteQuery`.
- Optimistic updates for chat, bids, availability toggles, saved searches.

## 7. Real-Time Architecture

| Channel | Use |
|---------|-----|
| Presence | Worker online/availability, "active now" |
| Chat | 1:1 + group threads, typing, read receipts |
| Voice notes | Upload + push delivery |
| Bids/Quotes | Live bid updates on a project |
| Job feed | New nearby jobs pushed to matching workers |
| Notifications | System events fan-out |

One socket connection, multiplexed by topic; reconnect with backoff; events patch React Query caches.

## 8. AI Layer (client-facing)

- `services/ai/` abstracts matching, recommendations, smart-quote, search ranking.
- Client sends context (location, role, history); backend AI returns ranked entities + explanations ("Matched because: 4.8★, 2km away, available today").
- **Explainable matching** is a UX requirement, not a nice-to-have — trust depends on it.
- Voice → intent (vernacular voice search) for low-literacy workers.

## 9. Offline & Sync

- App boots from cache; shows stale-while-revalidate.
- Write actions (mark attendance, send message, place bid, save search) enqueue when offline.
- `Network` plugin online event → replay queue, resolve conflicts (last-write-wins for drafts, server-authoritative for transactions).
- Critical money actions (payments, escrow release) are **online-only** with explicit guard.

## 10. Security & Trust

- Tokens in **SecureStorage** (Keychain/Keystore), never localStorage.
- Short-lived access + refresh rotation; biometric unlock optional.
- KYC tiers gate high-value actions (escrow, payouts).
- PII minimization on device; payment via PCI-compliant PSP SDK (no card data touches app).
- Certificate pinning for API; jailbreak/root detection for payment flows.

## 11. Performance Budget

- Cold start < 2.5s on mid-range Android; route chunks code-split per feature module.
- Lists virtualized; images lazy + responsive (WebP/AVIF, blur-up).
- 60fps animations via transform/opacity only; avoid layout thrash.
- Bundle: lazy-load heavy modules (video, maps, AI) on demand.

## 12. Build & Delivery

- Vite + module path aliases (`@features/*`, `@design/*`, `@services/*`).
- Capacitor live-update channel (e.g. Appflow/OTA) for non-native fixes.
- Environments: dev / staging / prod via `.env` + typed config.
- CI: lint + typecheck + unit + E2E gates before native build.
