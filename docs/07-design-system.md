# 07 — Design System (Senior UI/UX Designer)

A premium, trustworthy, India-ready SaaS design language. Everything is a **token** so light/dark and rebrands are config, not rework.

## 1. Brand Personality

**Trustworthy · Sturdy · Modern · Approachable.** Construction = strength + reliability; SaaS = clean + efficient. Avoid cheap "blue-collar app" clichés; aim for fintech-grade polish that still works for a low-literacy mason.

- **Logo idea:** "A" as a structural truss / level; wordmark in a confident geometric sans.
- **Voice:** plain, action-led, vernacular-friendly. "Find work near you," not "Discover opportunities in your vicinity."

## 2. Color System

### Primary palette
| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--brand-primary` | `#1E5EFF` (ANRIX Blue) | `#5B8CFF` | actions, links, active |
| `--brand-primary-strong` | `#1646C9` | `#3D6FE0` | pressed |
| `--accent` | `#FF7A1A` (Safety Orange) | `#FF9447` | highlights, FAB, energy |
| `--success` | `#1FA971` | `#3FD18C` | available, paid, completed |
| `--warning` | `#E6A700` | `#FFC233` | pending, low stock |
| `--danger` | `#E5484D` | `#FF6166` | errors, disputes |
| `--info` | `#0E9BC4` | `#3CC4E6` | info, AI |

### Neutrals (surface ramp)
| Token | Light | Dark |
|-------|-------|------|
| `--bg` | `#F6F8FB` | `#0E1116` |
| `--surface` | `#FFFFFF` | `#171B22` |
| `--surface-2` | `#F1F4F9` | `#1F242C` |
| `--border` | `#E3E8EF` | `#2A313B` |
| `--text-strong` | `#0C1320` | `#F2F5FA` |
| `--text` | `#39414D` | `#C5CCD6` |
| `--text-muted` | `#6B7480` | `#8A93A0` |

> Orange is a **secondary accent** (safety/energy), used sparingly for the FAB and key highlights — not as a primary surface, to keep trust/fintech feel. Blue carries primary actions.

### Semantic mapping (status the industry needs)
Available (success) · Busy (warning) · Offline (muted) · Verified (info/blue badge) · Escrow-held (info) · Paid (success) · Disputed (danger).

## 3. Typography

- **Font:** `Inter` (Latin) + `Noto Sans` family for Devanagari/Telugu/Tamil (vernacular coverage). System fallback for perf.
- **Scale (1.25 ratio):**

| Token | Size / line | Use |
|-------|-------------|-----|
| `display` | 32/40 700 | hero, balances |
| `h1` | 26/34 700 | screen titles |
| `h2` | 21/28 600 | section headers |
| `h3` | 18/26 600 | card titles |
| `body` | 16/24 400 | default (min 16 for readability) |
| `body-sm` | 14/20 400 | secondary |
| `caption` | 12/16 500 | meta, labels |
| `button` | 16/16 600 | CTAs |

> **16px minimum body** — critical for low-literacy + older users + bright outdoor sunlight (construction sites).

## 4. Spacing, Radius, Elevation

- **Spacing scale (4pt):** 2,4,8,12,16,20,24,32,40,48 → tokens `--space-1..10`.
- **Radius:** `--radius-sm 8` · `md 12` · `lg 16` · `xl 24` · `pill 999`. Cards `lg`; buttons `md`/`pill`; sheets `xl` top.
- **Elevation (soft, layered):** `--shadow-1` subtle card, `--shadow-2` raised/sheet, `--shadow-3` modal/FAB. Dark mode uses lighter surface tints instead of heavy shadows.
- **Touch targets:** min 48×48 (work-glove / outdoor reality).

## 5. Dark Mode

- True token-swap (no hardcoded colors anywhere). `prefers-color-scheme` + manual override in Settings, persisted.
- Dark = deep slate (`#0E1116`) not pure black (OLED smear + harshness); elevate via surface tint, not shadow.
- Maintain WCAG AA contrast in both themes; verify brand blue/orange on dark.

## 6. Motion & Animation (premium, purposeful)

- **Principles:** fast (150–250ms), eased (`cubic-bezier(.2,.8,.2,1)`), meaningful, interruptible, reduced-motion aware.
- **Token set:** `--motion-fast 150ms`, `--motion-base 220ms`, `--motion-slow 320ms`; springs for sheets/FAB.
- **Signature interactions:**
  - Page transitions: native iOS/Android stack push.
  - Bottom sheets (filters, quote, sheet actions): spring slide-up + backdrop fade.
  - Card press: subtle scale 0.98 + shadow lift.
  - Availability toggle: animated track + haptic.
  - Skeleton shimmer on load; success check-draw on payment/completion.
  - FAB: expand-to-actions radial/stack.
  - AI match reveal: staggered card fade-in + "matched" chip pop.
  - Pull-to-refresh: branded truss/level loader.
- Use transform/opacity only; respect `prefers-reduced-motion`.

## 7. Iconography & Imagery

- **Icons:** single consistent set (Ionicons base + custom trade glyphs: mason, plumber, weld, crane…). Outlined default, filled for active.
- **Trade illustration set** for categories/empty states — friendly, inclusive, Indian context.
- **Photography:** real sites, real workers (not stocky western imagery). Portfolio-first.
- **Empty states:** illustration + one-line + single CTA.

## 8. Component Specs (core)

**Button** — variants: primary (filled blue), accent (orange, sparing), secondary (outline), ghost, danger; sizes sm/md/lg; states default/hover/pressed/loading/disabled; full-width on mobile CTAs.

**EntityCard** — image/avatar, title + verified badge, rating + count, distance, price, status chip, primary+secondary action. Skeleton + pressed states defined.

**Input / Field** — label, helper, error, prefix/suffix, voice-input affordance for search & key fields; large 56px height; clear affordance.

**Chip / FilterChip** — selectable, count badge, active state; used for trades, filters, skills.

**StatCard** — label, big value, trend arrow, intent color; dashboard KPI unit.

**Sheet (BottomSheet)** — drag handle, snap points, scrollable; for filters, quotes, actions, payment.

**Badge** — Verified ✔, Top-rated ★, Available●, KYC-tier; semantic colors.

**TabBar** — 5 max, active = filled icon + label + brand color; optional center FAB.

**Avatar** — image/initials, online dot, verified ring.

**Rating** — stars + numeric + count; compact and full variants.

## 9. Accessibility & Inclusivity (non-negotiable)

- WCAG AA contrast both themes; 16px+ text; 48px+ targets.
- Full **i18n** (Hindi, English, Telugu, Tamil, Bengali, Marathi… expandable); never truncate translated strings — design for length.
- **Voice-first affordances** for low-literacy: voice search, voice messages, audio labels, icon + text always paired.
- Screen-reader labels on all interactive elements; focus order; dynamic type support.
- Color never the sole signal (icons + text for status).
- Works one-handed; primary actions in thumb zone.

## 10. Design Tokens (delivery format)

Ship tokens as a single source (`design-system/tokens/*.ts` → CSS variables + Ionic `:root`/`.dark` vars). Components consume variables only. This makes theming, white-label, and dark mode pure configuration.

```
tokens/
  color.ts      type.ts      space.ts
  radius.ts     shadow.ts    motion.ts
  → generate theme/light.css, theme/dark.css, theme/ionic-variables.css
```
