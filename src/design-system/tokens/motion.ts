/** Motion tokens — fast, eased, purposeful. See docs/07-design-system.md §6. */
export const motion = {
  duration: {
    fast: 150,
    base: 220,
    slow: 320,
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  },
  spring: {
    sheet: { stiffness: 320, damping: 32 },
    fab: { stiffness: 420, damping: 28 },
  },
} as const;
