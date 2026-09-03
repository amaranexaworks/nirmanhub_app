/**
 * Per-category professional accent.
 *
 * Zepto-style: every store/section reads with its own calm, distinct colour.
 * We map each material category to one of the design-system tone tokens
 * (`--anrix-tone-*`) — so the palette stays curated, on-brand, and swaps to the
 * correct translucent tints in dark mode for free. Amber remains the global
 * action/brand colour; these accents only tint section headers, category chips
 * and product-image backdrops.
 */
export type ToneKey = 'blue' | 'green' | 'amber' | 'violet' | 'rose' | 'teal' | 'slate';

export interface Accent {
  /** soft pastel wash (chip + image backdrop) */
  bg: string;
  /** saturated ink (active chip fill, icon) */
  fg: string;
  /** hairline that frames the chip */
  line: string;
}

const TONE_ORDER: ToneKey[] = ['blue', 'green', 'amber', 'violet', 'rose', 'teal', 'slate'];

/** keyword → tone, matched case-insensitively against the category name */
const RULES: Array<[RegExp, ToneKey]> = [
  [/cement|aggregate|sand|concrete|gravel|rmc/i, 'slate'],
  [/steel|iron|rebar|tmt|metal/i, 'blue'],
  [/brick|block|masonry|tile|stone/i, 'rose'],
  [/plumb|pipe|sanitary|water|fitting/i, 'teal'],
  [/electric|wire|cable|switch|light/i, 'amber'],
  [/paint|finish|putty|primer|coat|wall/i, 'violet'],
  [/tool|machine|equip|hardware|fasten/i, 'green'],
  [/safety|ppe|helmet|glove|gear/i, 'rose'],
  [/wood|ply|timber|door/i, 'amber'],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic tone for a category name — same name always gets the same colour. */
export function toneFor(category: string): ToneKey {
  const name = category || 'Other';
  for (const [re, tone] of RULES) if (re.test(name)) return tone;
  return TONE_ORDER[hash(name) % TONE_ORDER.length];
}

/** Resolve a category to its CSS-variable accent triple. */
export function categoryAccent(category: string): Accent {
  const t = toneFor(category);
  return {
    bg: `var(--anrix-tone-${t}-bg)`,
    fg: `var(--anrix-tone-${t}-fg)`,
    line: `var(--anrix-tone-${t}-line)`,
  };
}
