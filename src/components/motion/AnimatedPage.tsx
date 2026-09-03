import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { staggerContainer } from '@design/motion/variants';

/**
 * Wrap page content to get a staggered entrance for its direct children.
 * Children should use the `fadeInUp` / `scaleIn` variants (or wrap in <Reveal>).
 */
export function AnimatedPage({
  children,
  stagger = 0.07,
  className,
}: {
  children: ReactNode;
  stagger?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer(stagger)}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}
