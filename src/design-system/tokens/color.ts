/**
 * Color tokens — single source of truth. Components consume the generated CSS
 * variables (see theme/variables.css), never these raw hex values directly.
 * See docs/07-design-system.md §2.
 */

export const lightColors = {
  brandPrimary: '#EA6E15',
  brandPrimaryStrong: '#C4530C',
  accent: '#EA6E15',
  success: '#1F9D6B',
  warning: '#D99413',
  danger: '#E1483D',
  info: '#5B6472',

  bg: '#F6F8FB',
  surface: '#FFFFFF',
  surface2: '#F1F4F9',
  border: '#E3E8EF',
  textStrong: '#0C1320',
  text: '#39414D',
  textMuted: '#6B7480',
} as const;

export const darkColors = {
  brandPrimary: '#F6923D',
  brandPrimaryStrong: '#E0731D',
  accent: '#F6923D',
  success: '#2BBD84',
  warning: '#E6A730',
  danger: '#FF5D52',
  info: '#8A93A0',

  bg: '#0E1116',
  surface: '#171B22',
  surface2: '#1F242C',
  border: '#2A313B',
  textStrong: '#F2F5FA',
  text: '#C5CCD6',
  textMuted: '#8A93A0',
} as const;

export type ColorToken = keyof typeof lightColors;

/** Semantic status → color token, mirrors the industry states in the design system. */
export const statusColor = {
  available: 'success',
  busy: 'warning',
  offline: 'textMuted',
  verified: 'info',
  escrowHeld: 'info',
  paid: 'success',
  disputed: 'danger',
} as const satisfies Record<string, ColorToken>;
