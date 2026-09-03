/**
 * User-selectable brand accents. `amber` is the default baked into variables.css
 * (with proper light/dark variants); the others are applied at runtime by
 * overriding the CSS custom properties on <html>. See ThemeProvider.
 */
export type AccentKey = 'amber' | 'blue' | 'green' | 'teal' | 'navy' | 'purple' | 'crimson';

export interface Accent {
  key: AccentKey;
  label: string;
  /** solid primary — also used as the swatch color */
  primary: string;
  strong: string;
  tint: string;
  gradFrom: string;
  gradTo: string;
  /** "r, g, b" for building rgba() glows, soft fills & rings */
  rgb: string;
}

export const ACCENTS: Accent[] = [
  { key: 'amber', label: 'Amber', primary: '#ea6e15', strong: '#c4530c', tint: '#f5924a', gradFrom: '#fb8b3c', gradTo: '#d9590b', rgb: '234, 110, 21' },
  { key: 'blue', label: 'Blue', primary: '#2f6fed', strong: '#1f52c4', tint: '#6b9bff', gradFrom: '#4f86f7', gradTo: '#1f52c4', rgb: '47, 111, 237' },
  { key: 'green', label: 'Green', primary: '#1f9d57', strong: '#157a42', tint: '#46c07f', gradFrom: '#2fbd6e', gradTo: '#157a42', rgb: '31, 157, 87' },
  { key: 'teal', label: 'Teal', primary: '#0e9488', strong: '#0b7268', tint: '#34b3a6', gradFrom: '#14b3a3', gradTo: '#0b7268', rgb: '14, 148, 136' },
  { key: 'navy', label: 'Navy', primary: '#33477e', strong: '#22315b', tint: '#5a6ca6', gradFrom: '#41568f', gradTo: '#22315b', rgb: '51, 71, 126' },
  { key: 'purple', label: 'Purple', primary: '#7c4dff', strong: '#5f2fd0', tint: '#a17dff', gradFrom: '#9163ff', gradTo: '#5f2fd0', rgb: '124, 77, 255' },
  { key: 'crimson', label: 'Crimson', primary: '#e0483d', strong: '#b8362d', tint: '#f0736a', gradFrom: '#f0584d', gradTo: '#b8362d', rgb: '224, 72, 61' },
];

export const accentOf = (key: AccentKey): Accent => ACCENTS.find((a) => a.key === key) ?? ACCENTS[0];

/** CSS custom properties an accent overrides at runtime. */
export function accentVars(a: Accent): Record<string, string> {
  return {
    '--anrix-primary': a.primary,
    '--anrix-primary-strong': a.strong,
    '--anrix-accent': a.primary,
    '--anrix-primary-soft': `rgba(${a.rgb}, 0.1)`,
    '--anrix-gradient-brand': `linear-gradient(160deg, ${a.gradFrom} 0%, ${a.gradTo} 100%)`,
    '--anrix-header-bg': a.primary,
    '--anrix-header-gradient': a.primary,
    '--anrix-ring-primary': `0 0 0 4px rgba(${a.rgb}, 0.16)`,
    '--anrix-ink-glow': `radial-gradient(60% 45% at 50% 0%, rgba(${a.rgb}, 0.18) 0%, transparent 72%)`,
    '--ion-color-primary-tint': a.tint,
  };
}
