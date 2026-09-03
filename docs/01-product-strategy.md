# 01 — Product Strategy (Senior PM)

## 1. Vision & Mission

**Vision:** Become the operating system for India's construction economy — the default place where any building project is staffed, sourced, financed, tracked, and transacted.

**Mission:** Bring trust, liquidity, and digital tooling to a fragmented, cash-heavy, relationship-driven industry — from a single mason looking for tomorrow's work to a builder running ten sites.

## 2. Strategic Positioning

ANRIX is **not** "another app per role." It is one platform with three intersecting surfaces:

1. **Marketplace** — supply meets demand (workers, jobs, projects, materials, equipment, property).
2. **Network** — verified professional identity, portfolio, reputation, connections.
3. **Workspace** — tools to actually run the work (teams, attendance, payments, contracts, progress).

The marketplace creates the visit, the network creates the trust, the workspace creates the retention. Most competitors have one surface; ANRIX's defensibility is owning all three for one industry.

## 3. The 20 Users → 5 Archetypes

Designing 20 separate apps is a trap. Collapse the 20 roles into **5 behavioral archetypes** that drive the UX. Each user picks one or more roles; the archetype determines their default dashboard and tab bar.

| Archetype | Roles included | Core job-to-be-done | Primary surface |
|-----------|----------------|---------------------|-----------------|
| **A. Seeker (Demand)** | Home Owners, Property Buyers | "Find a trusted pro / property and get it done safely" | Marketplace (consume) |
| **B. Pro / Worker (Supply, individual)** | Masons, Labour, Carpenters, Painters, Electricians, Plumbers, Tile Workers, Steel Fixers, Welders, Fabricators | "Get steady, well-paid, nearby work and get paid on time" | Jobs + Network |
| **C. Expert (Supply, credentialed)** | Architects, Structural Engineers, Interior Designers | "Win projects, showcase portfolio, manage clients" | Network + Project |
| **D. Orchestrator (Demand + Supply)** | Builders, Contractors | "Source labour & materials, bid/win projects, run sites" | Workspace + Marketplace |
| **E. Vendor (Supply, goods)** | Material Suppliers, Equipment Rental Providers, Property Sellers | "List inventory, get qualified leads, fulfill orders" | Marketplace (sell) |

> **Design principle:** Build 5 dashboard templates and 5 tab-bar configs, not 20. Roles are *attributes* that flavor content, filters, and onboarding — not separate apps.

## 4. Persona Snapshots

- **Ramesh, Mason (Archetype B):** 34, smartphone-first, low text literacy, speaks Hindi/Telugu. Needs: voice-first, big buttons, work *near me today*, instant payment proof. Churns if onboarding > 2 min.
- **Priya, Home Owner (Archetype A):** 38, renovating a flat. Needs: vetted pros, transparent quotes, reviews, escrow so she isn't cheated. Will pay a convenience premium for trust.
- **Anil, Contractor (Archetype D):** 45, runs 3 sites, 40 workers. Needs: assemble teams fast, track attendance, pay weekly, bid on builder projects, buy cement at bulk rates. Highest LTV user.
- **Sneha, Interior Designer (Archetype C):** 29, freelance. Needs: portfolio that wins clients, lead flow, quotation tool, milestone payments.
- **Gupta Cement Traders (Archetype E):** Needs qualified bulk buyers, not tire-kickers; catalog + RFQ + logistics.

## 5. Value Proposition by Side

| Side | Pain today | ANRIX value |
|------|-----------|-------------|
| Workers | Idle days, middlemen cuts, payment delays, no proof of skill | Nearby jobs, direct hiring, on-time digital pay, verified skill badges, ratings = more work |
| Home owners | Can't find/trust pros, opaque pricing, project risk | Vetted matches, transparent quotes, escrow, progress tracking |
| Contractors/Builders | Labour sourcing chaos, material price opacity, bidding offline | Instant team assembly, attendance/payments tooling, transparent material rates, digital bidding |
| Experts | Feast/famine lead flow, no showcase | Portfolio + reputation + qualified leads + milestone payments |
| Vendors | Unqualified leads, no reach | Catalog, RFQ, location-targeted buyers, ratings |

## 6. Monetization (multi-stream)

1. **Take rate / commission** on completed hires, jobs, material & equipment orders (escrow-enabled).
2. **Subscriptions** — Pro tiers (Worker Plus, Contractor Pro, Vendor Storefront) for boosted visibility, more leads, analytics, team seats.
3. **Lead/credits** — pay-per-qualified-lead for vendors & experts (IndiaMART model).
4. **Listing fees / featured** — property & equipment featured placement.
5. **Payments float + value-added finance** — wallet, payroll for workers, working-capital credit, insurance (later phase).
6. **Verification & badges** — paid KYC/skill certification as a trust premium.

> **Sequencing:** Lead with *free liquidity* (no take rate) to build supply/demand density city-by-city. Introduce take rate + escrow once trust is the reason people stay. Subscriptions and credits come after density.

## 7. MVP Scope (don't boil the ocean)

**Phase 0 — Trust & Liquidity Loop (launch, 1 city):**
- Role-based onboarding + KYC-lite + multi-role accounts
- Pro profiles + portfolio + reviews/ratings
- Worker hiring marketplace + nearby/GPS discovery + availability
- Construction jobs marketplace
- Chat + voice messaging
- Wallet + basic payments
- Role dashboards (5 templates)
- Notifications, saved searches

**Phase 1 — Workspace & Money:**
- Bidding + quotation system
- Digital contracts + escrow
- Team management + attendance + worker payments/payroll
- Material marketplace + equipment rental
- AI matching/recommendations v1

**Phase 2 — Scale & Depth:**
- Property buy/sell module
- Construction progress tracking
- Video calling
- Advanced AI recommendations, structural/architect collaboration tools
- Finance/insurance partners

> Property buy/sell is intentionally **Phase 2** — it's a different buyer psychology and competes with entrenched players; win the labour+materials loop first.

## 8. North-Star & KPIs

**North-Star Metric:** *Successful work connections per week* (a hire, job, or order that reaches "completed + paid + rated").

Supporting KPIs:
- Supply density (active pros per pincode), Demand density (open jobs per pincode)
- Time-to-first-match, Match acceptance rate
- GMV, take-rate revenue, escrow adoption %
- Repeat hire rate, weekly retention by archetype
- Trust signals: % verified, avg rating, dispute rate
- Worker outcomes: avg working days/month, payment-on-time %

## 9. Defensibility / Moats

1. **Hyperlocal liquidity** — density per pincode is hard to copy.
2. **Trust graph** — verified identity + ratings + transaction history compounds.
3. **Workspace lock-in** — once payroll/attendance/contracts live here, switching cost is high.
4. **Two-sided data → AI matching** — better matches with scale.
5. **Payments + escrow rails** — financial relationship deepens retention.

## 10. Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Cold-start (chicken-egg liquidity) | Single-city launch, seed supply via field ops, free take rate early |
| Low digital literacy of workers | Voice-first, vernacular, icon-heavy, < 2-min onboarding |
| Trust / fraud | Layered KYC, escrow, ratings, dispute resolution, deposit holds |
| Cash-economy leakage (off-platform deals) | Make on-platform *better*: escrow protection, payment proof, ratings only count on-platform |
| Role complexity overwhelming UX | 5-archetype model, progressive disclosure, role-specific dashboards |
