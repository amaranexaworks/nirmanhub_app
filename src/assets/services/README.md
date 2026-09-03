# Branded service photos

Drop your Karya-Hero-style images here and every worker card + service tile in the app will
use them automatically — **no code changes needed**.

## How

- Name each file after the trade, e.g. `mason.png`, `labour.png`, `housekeeping.png`.
- Accepted types: `.png` `.jpg` `.jpeg` `.webp`
- Recommended: square-ish, at least **600×600**, subject centred (the model + tool), on a
  clean/transparent or brand background. Same model across files = the consistent "one man"
  look you want.
- Add as few or as many as you like. Any trade without a file falls back to a generic real
  trade photo, so the app never breaks.

## Filenames the app looks for

Core services (add these first — they're the most visible):

| File | Shows on |
|------|----------|
| `labour.png` | Labour |
| `mason.png` (or `mistri.png`) | Mistri / Mason |
| `carpenter.png` | Carpenter |
| `painter.png` | Painter |
| `electrician.png` | Electrician |
| `plumber.png` | Plumber |
| `tile_worker.png` (or `tile_mistri.png`) | Tile work |
| `housekeeping.png` (or `cleaning.png`) | Housekeeping |
| `welder.png` | Welder |
| `gardener.png` | Gardener |
| `demolition.png` | Demolition |
| `plasterer.png` | Plasterer |
| `driver.png` (or `van.png`) | Driver |

Any other role works too — just name the file with its role code (see `ROLE_CATALOG` in
`src/types/roles.ts` for the full list, e.g. `steel_fixer.png`, `hvac.png`, `roofer.png`).

Friendly aliases also work: `mistri`→mason, `cleaning`/`maid`→housekeeping, `tile`/`tiles`→tile_worker,
`van`→driver, `labor`/`helper`→labour, `operator`→equipment_operator, `consultant`→civil_engineer.
