# 05 — Screens & Wireframes

Low-fidelity ASCII wireframes to lock layout & hierarchy before pixels. `[ ]`=button, `( )`=input, `▣`=image, `★`=rating, `≡`=tab bar.

## Screen Inventory (by area)

**Onboarding (8):** Splash · Welcome carousel · Language · Phone/OTP · Role select · Profile wizard · KYC-lite · Location/personalization.

**Seeker (10):** Home · Discover (list) · Discover (map) · Search+filters · Pro profile · Request quote · Compare quotes · Booking detail/progress · Bookings list · Review.

**Pro/Worker (11):** Home · Jobs feed · Job detail · Availability · My Work/Attendance · Earnings/Wallet · Apply/Bid · Skills/Badges · Portfolio editor · Reviews · Profile.

**Expert (8):** Home · Leads/RFQs · Lead detail/Proposal · Portfolio · Project workspace · Quotation builder · Reviews · Profile.

**Orchestrator (16):** Dashboard · Hire workers · Worker results/map · Project marketplace · Project detail/bid · Materials · Material detail/RFQ · Equipment · Create hub · Site list · Site detail · Team · Attendance/muster · Payroll · Contracts · Bids/Quotes.

**Vendor (9):** Dashboard · Catalog · Add listing · Listing detail · Orders · Lead/RFQ detail · Quotation · Storefront · Profile.

**Global (12):** Universal search · Notifications · Chat list · Chat thread · Voice recorder · Video call · Wallet · Add money/Withdraw · Transactions · Settings · Help/Disputes · Role switcher.

---

## Key Wireframes

### Seeker — Home
```
┌──────────────────────────────┐
│ ☰  ANRIX      🔍   🔔  [Role▾] │
│ ( Search pros, jobs, property )│
│ ── Categories ──────────────  │
│ [Mason][Plumber][Painter][Elec]│
│ [Carpenter][Tile][More…]      │
│ ── Top rated near you ──────  │
│ ┌──────┐ ┌──────┐ ┌──────┐    │
│ │▣ ★4.9│ │▣ ★4.8│ │▣ ★4.7│    │
│ │Ravi  │ │Sunil │ │Imran │    │
│ │2km ₹/d│ │3km   │ │1km   │   │
│ └──────┘ └──────┘ └──────┘    │
│ ── Recommended for you (AI) ─ │
│ [ Mason for tiling • 1.2km ]  │
│ ── Your bookings ───────────  │
│ [ Active: Plumbing • in prog ]│
│≡ Home  Discover  Bookings  Msg  Profile│
└──────────────────────────────┘
```

### Pro/Worker — Home
```
┌──────────────────────────────┐
│ Hi Ramesh 👋        🔔  [Role▾]│
│ ┌──── Availability ─────────┐ │
│ │ Available today   ◯──●ON  │ │
│ │ Radius: 5km  Rate: ₹800/d │ │
│ └───────────────────────────┘ │
│ ── Earnings ────────────────  │
│ This week ₹4,200  [Withdraw]  │
│ ── Matches near you (AI) ───  │
│ ┌───────────────────────────┐ │
│ │ Tiling job • 1.5km • ₹900 │ │
│ │ ★4.6 employer   [View][Bid]│ │
│ └───────────────────────────┘ │
│ ┌───────────────────────────┐ │
│ │ Wall plaster • 3km • ₹750 │ │
│ └───────────────────────────┘ │
│  🎤 "Find work near me"        │
│≡ Home  Jobs  Available  Msg  Profile│
└──────────────────────────────┘
```

### Pro Profile (viewed by Seeker)
```
┌──────────────────────────────┐
│ ‹ Back            ♡  ⤴ Share  │
│   ▣  Ravi Kumar  ✔Verified    │
│   Mason • ★4.9 (213) • 2km    │
│   Available today • ~10min resp│
│ [ Chat ][ Request Quote ]     │
│ ── Skills ──────────────────  │
│ Tiling · Brickwork · Plaster  │
│ ── Portfolio ───────────────  │
│ ▣ ▣ ▣ ▣  (gallery)            │
│ ── Rate card ───────────────  │
│ Day ₹800 · Tiling ₹35/sqft    │
│ ── Reviews ─────────────────  │
│ ★★★★★ "On time, neat" –Priya  │
│ ── Verification ────────────  │
│ ✔ ID  ✔ Skill  ✔ 50+ jobs     │
│ [   Request Quote (sticky)  ] │
└──────────────────────────────┘
```

### Discover — Map (Nearby/GPS)
```
┌──────────────────────────────┐
│ ‹  Plumbers near you   [List] │
│ ┌──────── MAP ──────────────┐ │
│ │      📍you                 │ │
│ │   ◉Ravi   ◉Sunil          │ │
│ │      ◉Imran    ◉Anil      │ │
│ └───────────────────────────┘ │
│ Filters:[Dist▾][★▾][₹▾][Now]  │
│ ┌─ swipeable card ──────────┐ │
│ │ ▣ Ravi ★4.9 · 1.2km ·₹800 │ │
│ │ [Chat]        [Quote]     │ │
│ └───────────────────────────┘ │
└──────────────────────────────┘
```

### Orchestrator — Dashboard
```
┌──────────────────────────────┐
│ Anil Constructions   🔔 [Role▾]│
│ ── Today ───────────────────  │
│ Sites 3 · Present 34/40 · ⚠2  │
│ ┌─────────┬─────────┬───────┐ │
│ │Active   │Open bids│Spend  │ │
│ │sites 3  │  5      │₹2.1L  │ │
│ └─────────┴─────────┴───────┘ │
│ ── Attendance snapshot ─────  │
│ Site A ▰▰▰▰▱ 12/15            │
│ Site B ▰▰▰▰▰ 15/15            │
│ ── Pending payroll ─────────  │
│ [ Pay 34 workers • ₹48,200 ] │
│ ── Open bids on projects ───  │
│ [ Villa project • you: ₹12L ] │
│≡ Dash  Market  ➕  Sites  Profile│
└──────────────────────────────┘
```

### Attendance / Muster Roll (Orchestrator)
```
┌──────────────────────────────┐
│ ‹ Site A • Attendance  📅Today │
│ Present 12 · Absent 3 · ◑1     │
│ ┌───────────────────────────┐ │
│ │▣ Ramesh  Mason   [✔In 8:05]│ │
│ │▣ Sunil   Helper  [Mark In] │ │
│ │▣ Imran   Mason   [Out 5:10]│ │
│ └───────────────────────────┘ │
│ [ Mark all present ]          │
│ [ Calculate wages → Payroll ] │
└──────────────────────────────┘
```

### Project Bidding (Orchestrator views Builder project)
```
┌──────────────────────────────┐
│ ‹ Villa G+2 • Whitefield      │
│ Budget ₹12–14L · 120 days     │
│ Scope: civil + finishing      │
│ Docs: [BOQ.pdf][Plan.pdf]     │
│ ── Live bids (8) ───────────  │
│ 1 ABC ₹11.8L ★4.7  110d       │
│ 2 You ₹12.2L ★4.6  115d       │
│ ── Your bid ────────────────  │
│ Price ( ₹12,20,000 )          │
│ Timeline ( 115 days )         │
│ Note ( ... )                  │
│ [    Submit / Update Bid    ] │
└──────────────────────────────┘
```

### Vendor — Catalog & Add Listing
```
┌─────────────┐   ┌──────────────────────┐
│ Catalog   ➕ │   │ ‹ Add Listing        │
│ ▣ Cement OPC│   │ Type [Material▾]     │
│ ₹380/bag    │   │ Name ( UltraTech OPC )│
│ Stock 240   │   │ ▣ + add photos       │
│ ▣ TMT Steel │   │ Price slabs:         │
│ ₹62/kg      │   │  1–50 ( ₹385 )       │
│ Stock 5T    │   │  50+  ( ₹375 )       │
│ [Edit][Boost]│   │ Delivery ( 2 days )  │
│≡ Dash Cat ➕ │   │ [   Publish   ]      │
│  Orders Prof│   └──────────────────────┘
└─────────────┘
```

### Chat Thread (with voice + video)
```
┌──────────────────────────────┐
│ ‹ Ravi (Mason) ★4.9   📞 📹    │
│ ┌─ their ───────┐             │
│ │ Available tmrw?│             │
│ └────────────────┘            │
│            ┌─ you ──────────┐ │
│            │ Yes, 9am ok    │ │
│            └────────────────┘ │
│ ┌─ voice ▷ 0:08 ──────────┐  │
│ ( message )  🎤  📎  [Send]   │
└──────────────────────────────┘
```

### Wallet & Escrow
```
┌──────────────────────────────┐
│ Wallet                        │
│ Balance  ₹12,480              │
│ [ Add money ] [ Withdraw ]    │
│ ── In escrow ───────────────  │
│ Plumbing job ₹2,000 (held)    │
│ [ Release on completion ]     │
│ ── Transactions ────────────  │
│ + ₹4,200 Tiling job  Jun 22   │
│ – ₹500 Withdraw      Jun 20   │
└──────────────────────────────┘
```

---

## Dashboard Layout System (5 templates)

Every dashboard = same skeleton, different widgets:

```
[ Greeting + role + notif + role-switch ]
[ Primary status strip (KPIs/availability) ]
[ Primary CTA (role's #1 action) ]
[ AI / recommended module ]
[ Active work module (bookings/jobs/sites/orders) ]
[ Secondary modules (earnings/payroll/leads) ]
[ Tab bar ]
```

| Archetype | KPI strip | Primary CTA | AI module | Active module |
|-----------|-----------|-------------|-----------|---------------|
| Seeker | Active bookings | Find a pro | Recommended pros | Bookings |
| Worker | Earnings + availability | Go available / Find work | Job matches | My work/attendance |
| Expert | Leads + active projects | View leads | Suggested RFQs | Projects |
| Orchestrator | Sites/present/spend | Create (job/project) | Matched workers | Attendance + payroll |
| Vendor | Leads/orders/revenue | Add listing | Hot RFQs | Orders |

## State coverage (every list/screen must define)
Loading (skeleton) · Empty (coaching CTA) · Error (retry) · Offline (cached + banner) · Success.
