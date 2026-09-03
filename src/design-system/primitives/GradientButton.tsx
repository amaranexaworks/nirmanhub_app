import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import { haptic } from '@lib/haptics';

type Variant = 'brand' | 'accent' | 'glass' | 'outline';

// Primary CTAs are amber (brand identity) with dark text — never charcoal/black.
const AMBER_FILL = 'linear-gradient(180deg, #ffc733 0%, #f5b301 100%)';
const bg: Record<Variant, string> = {
  brand: AMBER_FILL,
  accent: AMBER_FILL,
  glass: 'var(--anrix-glass-bg)',
  outline: 'transparent',
};

/** Primary CTA with gradient fill, press spring + haptic, loading state. */
export function GradientButton({
  children,
  onClick,
  variant = 'brand',
  icon,
  loading,
  disabled,
  full = true,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: React.CSSProperties;
}) {
  const isFlat = variant === 'glass' || variant === 'outline';
  const isAmber = variant === 'brand' || variant === 'accent';
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      disabled={disabled || loading}
      onClick={() => {
        void haptic.medium();
        onClick?.();
      }}
      style={{
        width: full ? '100%' : undefined,
        height: 44,
        border: variant === 'outline' ? '1.5px solid var(--anrix-border)' : 'none',
        borderRadius: 12,
        background: bg[variant],
        color: isFlat ? 'var(--anrix-text-strong)' : (isAmber ? 'var(--anrix-on-primary)' : '#fff'),
        backdropFilter: variant === 'glass' ? `blur(var(--anrix-glass-blur))` : undefined,
        fontWeight: 800,
        fontSize: 14.5,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        opacity: disabled ? 0.5 : 1,
        boxShadow: isFlat ? 'none' : '0 6px 16px rgba(154, 106, 6, 0.28)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {loading ? (
        <IonSpinner name="crescent" style={{ width: 20, height: 20 }} />
      ) : (
        <>
          {icon && <IonIcon icon={icon} style={{ fontSize: 18 }} />}
          {children}
        </>
      )}
    </motion.button>
  );
}
