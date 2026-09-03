# 04 — User Flows

Notation: `→` step, `⇒` system action, `◆` decision, `[E]` escrow/payment touchpoint.

## 1. Onboarding (all roles)

```
Splash ⇒ check session
  ◆ logged in → resume to role dashboard
  ◆ new →
Welcome carousel (3 value slides, skippable)
  → Select language (Hindi/English/Telugu/Tamil/…)
  → Enter phone → OTP verify  ⇒ account created
  → Select role(s)  [multi-select]  ⇒ derive archetype
  → Role-specific profile wizard (name, photo, trade/skills OR company)
  → Location permission → confirm pincode/city
  → KYC-lite (skip-allowed for browsing; required before money)
  → Personalization (categories/interests)
  ⇒ Land on role dashboard with empty-state coaching
```
**UX rules:** phone-OTP first; ≤ 2 min to first value; every step skippable except phone + role; progress bar; vernacular + voice labels for Archetype B.

## 2. Home Owner hires a Worker (Seeker → Pro)  ★core loop

```
Home/Discover → pick trade (e.g., "Plumber") OR universal search
  → Results (list + map toggle), filters: distance, rating, price, available-now
  → Open Pro profile (portfolio, reviews, rate card, availability, response time)
  ◆ Direct book  OR  Request quote
  → Request quote (describe job, photos/voice, location, date)
  ⇒ AI suggests fair price range + 2 alternate pros
  → Receive quotes → Compare quotes screen
  → Accept quote → Digital contract (scope, price, milestones) → e-sign
  → Pay to escrow [E]
  ⇒ Booking confirmed → chat thread opens
  → Worker checks in (attendance/GPS) → Progress updates (photos)
  → Mark complete → Release escrow [E] → Rate & review
```

## 3. Worker finds Work (Pro)  ★core loop

```
Home → toggle "Available today" ON  ⇒ presence broadcast
  → Jobs tab: nearby feed (GPS-ranked) + AI matches ("near you, your skill")
  → Open job → see scope, pay, distance, employer rating
  ◆ Apply / Bid / Accept
  ⇒ Employer notified → chat
  → Hired → contract → check-in on site (attendance)
  → Work → completion → payment received to wallet [E]
  → Withdraw to bank / UPI
  → Get rated  ⇒ reputation ↑ → more matches
```
**Voice-first:** "Find work near me" voice button; large cards; minimal text.

## 4. Contractor assembles a Team & runs a Site (Orchestrator)

```
Dashboard → Create (➕) → Post Job (trade, count, days, rate, location)
  ⇒ AI matches & invites nearby available workers
  → Review applicants (ratings, distance, history) → Bulk select → Hire team
  → Create/assign to Site → Generate contracts → workers e-sign
  Daily: Attendance (muster roll) → check-in/out → auto-calc wages
  Weekly: Payroll → review → pay all [E] → advances if needed
  Site detail: tasks, progress photos, material needs → order materials
```

## 5. Builder posts Project → Contractors Bid (Project marketplace)

```
Builder → Create → Post Project (scope, BOQ, timeline, budget, docs)
  ⇒ Visible in Builder Project Marketplace to qualified contractors
Contractor → Marketplace → open project → submit Bid (price, timeline, terms)
  ⇒ Live bid list updates (Builder sees ranked bids + ratings)
Builder → Compare bids → Q&A chat → Award → Contract + milestone escrow [E]
  → Progress tracking → milestone approvals → staged payouts [E]
```

## 6. Quotation flow (Expert / Vendor)

```
Lead/RFQ received → open → review requirement
  → Build quotation (line items, qty, rate, taxes, validity)
  ⇒ Smart-quote AI prefills market rates
  → Send → client reviews → negotiate (chat) → accept → contract [E]
```

## 7. Material purchase (Orchestrator/Seeker ↔ Vendor)

```
Marketplace → Materials → category (Cement/Steel/Tiles…)
  → Product detail (specs, price slabs, vendor rating, delivery ETA)
  ◆ Buy now  OR  Request bulk quote (RFQ)
  → RFQ → vendors quote → compare → order → pay [E] → track delivery → rate
```

## 8. Equipment rental

```
Marketplace → Equipment → type, date range, location
  → Availability calendar → book → deposit + rent [E]
  → Pickup/delivery → usage period → return → deposit release [E] → rate
```

## 9. Property buy/sell (Phase 2)

```
Buyer: Discover → Property search (type, budget, locality, map)
  → Property detail (photos, plan, price, seller, nearby) → enquire/visit request → chat → negotiate
Seller: Add Listing (details, photos, price, docs) → manage enquiries → mark sold
```

## 10. Payments & Wallet (cross-cutting)

```
Add money (UPI/card/netbanking) → Wallet
Escrow: payer funds → held → released on completion/milestone → payee wallet
Payout: wallet → bank/UPI (KYC-gated)
Disputes: raise → evidence (chat, photos, contract) → resolution → partial/full release
```

## 11. Multi-role switching

```
Any screen → header role switcher → select role
  ⇒ Shell swaps (tabs + dashboard + features) without re-login
  ⇒ Notifications & wallet shared; context-specific data scoped per role
```

## 12. Notifications → action

```
Push (new job / bid / message / payment / milestone)
  → tap → deep link → correct tab + stacked detail → act inline
In-app inbox groups by type; saved searches trigger alerts.
```
