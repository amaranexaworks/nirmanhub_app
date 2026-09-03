/**
 * Soft, layered elevation. Dark mode prefers surface tint over heavy shadow.
 * See docs/07-design-system.md §4.
 */
export const shadow = {
  1: '0 1px 2px rgba(12, 19, 32, 0.06), 0 1px 3px rgba(12, 19, 32, 0.08)',
  2: '0 4px 12px rgba(12, 19, 32, 0.10)',
  3: '0 12px 32px rgba(12, 19, 32, 0.16)',
} as const;

export const shadowDark = {
  1: '0 1px 2px rgba(0, 0, 0, 0.40)',
  2: '0 6px 16px rgba(0, 0, 0, 0.48)',
  3: '0 16px 40px rgba(0, 0, 0, 0.56)',
} as const;

export type ShadowToken = keyof typeof shadow;
