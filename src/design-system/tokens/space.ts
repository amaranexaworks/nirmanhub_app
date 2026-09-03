/** 4pt spacing scale. See docs/07-design-system.md §4. */
export const space = {
  1: 2,
  2: 4,
  3: 8,
  4: 12,
  5: 16,
  6: 20,
  7: 24,
  8: 32,
  9: 40,
  10: 48,
} as const;

/** Minimum interactive target — glove/outdoor friendly. */
export const TOUCH_TARGET_MIN = 48;

export type SpaceToken = keyof typeof space;
