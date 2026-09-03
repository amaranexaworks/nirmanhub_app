import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { pressTap } from '@design/motion/variants';
import { haptic } from '@lib/haptics';

/** Tactile press wrapper: scale-down + light haptic. Use for cards/tiles/rows. */
export function Pressable({
  children,
  onPress,
  disabled,
  style,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <motion.div
      role={onPress ? 'button' : undefined}
      aria-label={ariaLabel}
      tabIndex={onPress ? 0 : undefined}
      className={className}
      style={{ cursor: onPress ? 'pointer' : undefined, ...style }}
      whileTap={disabled ? undefined : pressTap}
      onTap={() => {
        if (disabled) return;
        void haptic.light();
        onPress?.();
      }}
    >
      {children}
    </motion.div>
  );
}
