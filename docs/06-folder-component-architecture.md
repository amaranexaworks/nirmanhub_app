# 06 — Folder & Component Architecture

## 1. Modular Folder Structure (feature-first)

```
src/
├── app/                          # app shell & bootstrapping
│   ├── App.tsx                   # IonApp + providers
│   ├── providers/                # QueryClient, Theme, Auth, I18n, Toast
│   ├── routing/                  # route tree, guards, tab configs
│   │   ├── guards/               # AuthGuard, RoleCapabilityGuard, KycGuard
│   │   ├── tabConfigs.ts         # tab bar per archetype
│   │   └── AppRouter.tsx
│   └── config/                   # env, feature flags, constants
│
├── design-system/                # the design system (see doc 07)
│   ├── tokens/                   # color, type, spacing, radius, shadow, motion
│   ├── theme/                    # light/dark CSS variables, ionic variables
│   ├── primitives/               # Button, Text, Card, Input, Avatar, Badge, Chip…
│   ├── patterns/                 # ListItem, SectionHeader, EmptyState, StatCard…
│   └── icons/
│
├── components/                   # shared cross-feature composites
│   ├── layout/                   # PageShell, Header, BottomTabBar, Fab, SafeArea
│   ├── feedback/                 # Skeleton, ErrorState, OfflineBanner, Toast
│   ├── media/                    # ImageGallery, VoiceRecorder, VideoCallView
│   ├── map/                      # MapView, NearbyMarkers, RadiusSelector
│   ├── search/                   # SearchBar, FilterSheet, SortMenu
│   └── data/                     # InfiniteList, VirtualList, Paginator
│
├── features/                     # ★ business modules (self-contained)
│   ├── auth/
│   ├── onboarding/
│   ├── profile/
│   ├── roles/                    # role resolver, archetype, role switcher
│   ├── hiring/                   # worker hiring marketplace
│   ├── jobs/                     # construction jobs marketplace
│   ├── projects/                 # builder project marketplace + bidding
│   ├── discovery/                # nearby/GPS search, saved searches
│   ├── materials/                # material marketplace + RFQ
│   ├── equipment/                # equipment rental
│   ├── property/                 # buy/sell (Phase 2)
│   ├── quotations/               # quote/bid builder & compare
│   ├── contracts/                # digital contracts, e-sign, milestones
│   ├── sites/                    # site & progress tracking
│   ├── teams/                    # team management
│   ├── attendance/               # attendance/muster
│   ├── payroll/                  # worker payments/payroll
│   ├── availability/             # worker availability
│   ├── reviews/                  # ratings & reviews
│   ├── messaging/                # chat + voice
│   ├── calling/                  # video/voice calls
│   ├── wallet/                   # wallet, payments, escrow
│   ├── notifications/
│   ├── ai/                       # matching & recommendations UI
│   └── dashboards/               # 5 role dashboard templates
│
├── services/                     # platform + data layer
│   ├── api/                      # typed clients per domain + base http
│   ├── realtime/                 # socket client, channels, presence
│   ├── location/                 # geolocation, geocoding, distance
│   ├── payments/                 # PSP SDK wrapper, escrow ops
│   ├── media/                    # camera, upload, audio
│   ├── push/                     # FCM/APNs registration & handlers
│   ├── storage/                  # secure storage, cache, offline queue
│   └── ai/                       # AI endpoints wrapper
│
├── stores/                       # Zustand stores (auth, role, ui, drafts)
├── hooks/                        # cross-cutting hooks (useNetwork, useGeo, useDebounce)
├── lib/                          # pure utils (format, currency, date, validators)
├── types/                        # shared TS types + Zod schemas
├── i18n/                         # locales (en, hi, te, ta…), config
└── assets/                       # images, lottie, fonts
```

### Inside each feature module (consistent contract)
```
features/hiring/
├── pages/                # route-level screens (HireSearchPage, HireDetailPage…)
├── components/           # feature-local components (WorkerCard, QuoteSheet…)
├── hooks/                # useWorkerSearch, useHireFlow, useQuoteCompare
├── api/                  # hiringApi (typed) — or re-exports services/api
├── store/                # feature-local state if needed (wizard step)
├── types.ts             # feature types + Zod schemas
├── utils.ts
└── index.ts             # public surface (only export what other features need)
```

**Rules:**
- Features may depend on `design-system`, `components`, `services`, `lib`, `types` — **never on another feature's internals** (only its `index.ts` public API). Cross-feature need → promote to `components/` or a shared service.
- Pages are thin; logic in hooks; data in api/services.

## 2. Component Taxonomy (Atomic-ish, 4 tiers)

| Tier | Lives in | Examples | Knows about |
|------|----------|----------|-------------|
| **Primitives** | `design-system/primitives` | Button, Text, Input, Card, Avatar, Badge, Chip, Switch, Skeleton | tokens only; no business logic |
| **Patterns** | `design-system/patterns` | StatCard, ListItem, SectionHeader, EmptyState, RatingStars, PriceTag, FilterChip | composition of primitives |
| **Composites** | `components/*` | SearchBar, MapView, VoiceRecorder, InfiniteList, FilterSheet, BottomTabBar | generic, reusable across features |
| **Feature components** | `features/*/components` | WorkerCard, JobCard, BidPanel, AttendanceRow, QuotationBuilder, EscrowCard | domain-aware, feature-scoped |

## 3. Key Reusable Components (spec highlights)

- **`EntityCard`** (configurable base for WorkerCard/JobCard/MaterialCard/PropertyCard): avatar/image, title, rating, distance, price, status chips, primary+secondary action. Variants via props, not copies.
- **`PageShell`**: header (title/back/actions) + scroll content + optional sticky footer CTA + safe-area + pull-to-refresh. Every page uses it.
- **`FilterSheet`**: bottom-sheet with distance/rating/price/availability; emits a typed filter object consumed by search hooks.
- **`StatCard`**: KPI tile for dashboards (label, value, trend, intent color).
- **`EmptyState` / `ErrorState` / `Skeleton`**: enforced on every async surface.
- **`RoleSwitcher`**: header control; lists user roles, swaps shell.
- **`StickyCTA`**: persistent primary action (Request Quote, Submit Bid, Pay).
- **`AIInsight`**: explainable-match chip/row ("Matched: 4.8★ · 2km · free today").

## 4. Hook Patterns

- **Data hooks** wrap React Query: `useWorkerSearch(filters)`, `useJobFeed(geo)`, `useChatThread(id)` — return `{data, isLoading, error, fetchNextPage}`.
- **Flow hooks** orchestrate multi-step wizards: `useHireFlow()` exposes `{step, next, back, submit, draft}`.
- **Platform hooks:** `useGeolocation()`, `useNetworkStatus()`, `usePushToken()`, `useVoiceRecorder()`.
- **Role hook:** `useRoleContext()` → archetype, tabs, capabilities, features.

## 5. Naming & Conventions

- Components `PascalCase.tsx`; hooks `useThing.ts`; utils `camelCase.ts`; types/schemas in `types.ts`.
- One component per file; co-locate styles (`.module.css`) and tests (`.test.tsx`).
- Path aliases: `@app`, `@design`, `@components`, `@features`, `@services`, `@stores`, `@hooks`, `@lib`, `@types`.
- Public API per feature via `index.ts`; lint rule forbids deep cross-feature imports.

## 6. Why this scales to 20 roles / 27 features

- Roles are config; features are isolated modules; shared UI is centralized → adding a role = new tab config + dashboard widgets; adding a feature = new folder under `features/` with no churn elsewhere.
