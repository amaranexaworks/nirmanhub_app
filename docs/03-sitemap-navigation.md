# 03 — Sitemap & Navigation

## 1. Navigation Model

- **Pattern:** Bottom **tab bar** (5 tabs max) per archetype + stacked navigation within each tab + a global modal layer (chat, create actions, role switch).
- **Why 5 tabs:** thumb-reachable, industry standard, prevents role-overload. Extra destinations live behind the "More/Profile" tab and contextual entry points.
- **Center FAB** on Orchestrator/Vendor for primary create action (Post Job / Add Listing).
- **Global header:** search, notifications bell, role switcher (multi-role), avatar.

## 2. Role-Based Tab Bars

| Archetype | Tab 1 | Tab 2 | Tab 3 (center) | Tab 4 | Tab 5 |
|-----------|-------|-------|----------------|-------|-------|
| **A — Seeker** | Home | Discover (Pros/Property) | Bookings | Messages | Profile |
| **B — Pro/Worker** | Home | Jobs (Nearby) | Availability | Messages | Profile |
| **C — Expert** | Home | Leads/Projects | Portfolio | Messages | Profile |
| **D — Orchestrator** | Dashboard | Marketplace | **➕ Create** | Sites/Teams | Profile |
| **E — Vendor** | Dashboard | Catalog | **➕ Add Listing** | Orders/Leads | Profile |

> Tabs are config objects; the resolver picks the set from active role. "Home/Dashboard" is always the role-specific dashboard.

## 3. Complete Sitemap

```
ANRIX
│
├── ONBOARDING (unauthenticated)
│   ├── Splash
│   ├── Welcome / Value carousel
│   ├── Language select (vernacular)
│   ├── Auth (Phone OTP → primary) / Email / Social
│   ├── Role selection (multi-select, archetype derived)
│   ├── Profile setup (role-specific wizard)
│   ├── KYC-lite (Aadhaar/phone/skill)
│   ├── Location permission + pincode
│   └── Personalization (interests, categories)
│
├── A. SEEKER
│   ├── Home (recommended pros, categories, nearby, recent)
│   ├── Discover
│   │   ├── Browse by trade (Mason, Plumber…)
│   │   ├── Nearby map view
│   │   ├── Search + filters (rating, distance, price, availability)
│   │   ├── Pro profile (portfolio, reviews, availability, quote)
│   │   ├── Property search → Property detail
│   │   └── Saved searches
│   ├── Hire flow → Request quote → Compare quotes → Book → Contract → Pay (escrow)
│   ├── Bookings (upcoming / active / completed) → Progress tracking → Review
│   ├── Messages (chat, voice, video)
│   └── Profile (wallet, saved, addresses, settings, role add)
│
├── B. PRO / WORKER
│   ├── Home (today's matches, earnings, availability status, nearby jobs)
│   ├── Jobs
│   │   ├── Nearby jobs feed (GPS) + filters
│   │   ├── Job detail → Apply / Bid / Accept
│   │   ├── Applied / Invited
│   │   └── Saved searches + alerts
│   ├── Availability (calendar, today on/off, service radius, rate card)
│   ├── My Work (active gigs, attendance check-in, completion)
│   ├── Earnings & Wallet (payments received, payout, history)
│   ├── Messages
│   └── Profile (skills, badges, portfolio, reviews, KYC, verification)
│
├── C. EXPERT (Architect / Engineer / Interior)
│   ├── Home (lead summary, active projects, portfolio views)
│   ├── Leads / Projects (RFQs, invitations → proposal/quote)
│   ├── Portfolio (projects, photos, case studies, certifications)
│   ├── Project workspace (milestones, files, client chat, quotations)
│   ├── Messages (incl. video consults)
│   └── Profile (credentials, reviews, subscription tier)
│
├── D. ORCHESTRATOR (Builder / Contractor)
│   ├── Dashboard (sites overview, labour status, spend, open bids, KPIs)
│   ├── Marketplace
│   │   ├── Hire workers (search, nearby, bulk hire, teams)
│   │   ├── Builder project marketplace (browse/bid on projects)
│   │   ├── Materials (catalog, RFQ, orders)
│   │   └── Equipment rental (browse, book)
│   ├── Create (➕): Post Job / Post Project / Request Quote / Add Site
│   ├── Sites & Teams
│   │   ├── Sites list → Site detail (progress, photos, tasks)
│   │   ├── Teams (members, roles, invite)
│   │   ├── Attendance (daily, check-in/out, muster roll)
│   │   ├── Worker payments / payroll (weekly, advances)
│   │   └── Contracts (digital, e-sign, milestones)
│   ├── Bids & Quotes (incoming/outgoing, compare, award)
│   ├── Messages
│   └── Profile (company, GST, verification, wallet, subscription)
│
├── E. VENDOR (Material / Equipment / Property Seller)
│   ├── Dashboard (leads, orders, revenue, inventory alerts)
│   ├── Catalog / Listings (materials / equipment / properties)
│   ├── Add Listing (➕)
│   ├── Orders & Leads (RFQs, quotes, fulfillment, delivery)
│   ├── Messages
│   └── Profile (storefront, GST, reviews, subscription, payouts)
│
├── GLOBAL (cross-role, modal/stack)
│   ├── Search (universal, scoped by context)
│   ├── Notifications inbox
│   ├── Chat / Voice / Video call surfaces
│   ├── Wallet & Payments (add money, withdraw, transactions, escrow)
│   ├── Role switcher
│   ├── Settings (language, theme/dark mode, privacy, notifications)
│   ├── Help / Support / Disputes
│   └── Referrals
```

## 4. Routing Structure (illustrative)

```
/onboarding/*                       (guarded: unauth only)
/app                                (guarded: auth; shell + tabs by role)
  /app/home
  /app/discover  /app/jobs  /app/marketplace  ...   (tab roots, role-mapped)
  /app/pro/:id           (pro profile)
  /app/job/:id  /app/project/:id  /app/property/:id  /app/material/:id
  /app/hire/:proId/*     (hire wizard)
  /app/bid/:projectId
  /app/site/:id  /app/team/:id  /app/attendance/:siteId
  /app/chat/:threadId    /app/call/:roomId
  /app/wallet/*          /app/contracts/:id
  /app/profile/*  /app/settings/*  /app/notifications
```

- **Guards:** `AuthGuard`, `RoleCapabilityGuard`, `KycGuard` (for money/escrow), `OnboardingCompleteGuard`.
- **Deep links / push targets:** `anrix://job/123`, `anrix://chat/abc`, `anrix://bid/55` → resolve to stacked route within correct tab.
- **Tab state preservation:** each tab keeps its own navigation stack (Ionic `IonRouterOutlet` per tab).

## 5. Navigation Rules

1. Max 5 bottom tabs; overflow → Profile/More or contextual.
2. Primary create action = center FAB (D, E) or prominent CTA (others).
3. Back behavior: hardware back pops the active tab stack, then prompts exit on root.
4. Modals for: create flows, chat, call, role switch, filters, payment.
5. Persistent global affordances: notifications bell, role switcher, universal search.
