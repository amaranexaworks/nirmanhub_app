import type { Variants, Transition } from 'framer-motion';

/**
 * Shared Framer Motion variants. Fast, eased, purposeful — mirrors the motion
 * tokens in design-system/tokens/motion.ts. See docs/07-design-system.md §6.
 */

export const easeStandard = [0.2, 0.8, 0.2, 1] as const;

export const springSoft: Transition = { type: 'spring', stiffness: 320, damping: 32 };
export const springSnappy: Transition = { type: 'spring', stiffness: 420, damping: 28 };

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: easeStandard } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.28, ease: easeStandard } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: springSoft },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: easeStandard } },
};

/** Parent container that staggers its children's entrance. */
export const staggerContainer = (stagger = 0.06, delayChildren = 0.04): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Press feedback used by Pressable / buttons. */
export const pressTap = { scale: 0.97 };
export const hoverLift = { y: -2 };
