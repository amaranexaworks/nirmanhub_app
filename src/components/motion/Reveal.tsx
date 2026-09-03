import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeInUp, scaleIn, fadeIn, slideInRight } from '@design/motion/variants';

const VARIANTS = { fadeInUp, scaleIn, fadeIn, slideInRight };

/**
 * Item-level entrance. Use inside <AnimatedPage> (inherits the stagger) or
 * standalone with `standalone` to animate on mount.
 */
export function Reveal({
  children,
  variant = 'fadeInUp',
  standalone = false,
  delay,
  style,
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  standalone?: boolean;
  delay?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const v = VARIANTS[variant];
  return (
    <motion.div
      className={className}
      style={style}
      variants={v}
      {...(standalone ? { initial: 'hidden', animate: 'show' } : {})}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </motion.div>
  );
}
