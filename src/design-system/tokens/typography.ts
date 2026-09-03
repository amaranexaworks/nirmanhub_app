/** Type scale (1.25 ratio). 16px minimum body — see docs/07-design-system.md §3. */
export const typography = {
  fontFamily:
    "'Plus Jakarta Sans', 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Telugu', 'Noto Sans Tamil', system-ui, -apple-system, sans-serif",
  scale: {
    display: { size: 32, line: 40, weight: 700 },
    h1: { size: 26, line: 34, weight: 700 },
    h2: { size: 21, line: 28, weight: 600 },
    h3: { size: 18, line: 26, weight: 600 },
    body: { size: 16, line: 24, weight: 400 },
    bodySm: { size: 14, line: 20, weight: 400 },
    caption: { size: 12, line: 16, weight: 500 },
    button: { size: 16, line: 16, weight: 600 },
  },
} as const;

export type TextVariant = keyof typeof typography.scale;
