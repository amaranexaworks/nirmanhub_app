import { motion } from 'framer-motion';
import { BRAND } from './brand';
import brandLogo from '@assets/brand-logo-square.png';

/**
 * Nirmanam logo mark — the brand ribbon monogram, shown on a soft rounded tile so
 * the colourful mark reads cleanly on any background. `animated` adds a gentle
 * entrance and a continuous 3D float.
 */
export function LogoMark({ size = 72, animated = true }: { size?: number; animated?: boolean }) {
  return (
    <motion.div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: 'radial-gradient(120% 120% at 30% 20%, #ffffff 0%, #f4f6fb 100%)',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 16px 40px rgba(60, 40, 120, 0.28)',
        transformStyle: 'preserve-3d',
        overflow: 'hidden',
      }}
      initial={animated ? { scale: 0.6, opacity: 0, rotateY: -40 } : false}
      animate={
        animated
          ? { scale: 1, opacity: 1, rotateY: 0, y: [0, -6, 0] }
          : { scale: 1, opacity: 1 }
      }
      transition={
        animated
          ? {
              scale: { type: 'spring', stiffness: 260, damping: 18 },
              opacity: { duration: 0.4 },
              rotateY: { type: 'spring', stiffness: 200, damping: 16 },
              y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
            }
          : undefined
      }
    >
      <img
        src={brandLogo}
        alt={BRAND.name}
        width={size * 0.86}
        height={size * 0.86}
        style={{ objectFit: 'contain', display: 'block' }}
      />
    </motion.div>
  );
}

/**
 * Brand wordmark. By default the text is filled with the teal brand gradient
 * (good on light surfaces). Set `onDark` when it sits on the teal header or any
 * dark/coloured background — the gradient would be invisible there, so we render
 * solid white instead.
 */
export function Wordmark({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  const gradientFill: React.CSSProperties = {
    background: 'var(--anrix-gradient-brand)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', letterSpacing: '0.04em' }}>
      <span style={{ fontSize: size, fontWeight: 800, ...(onDark ? { color: '#ffffff' } : gradientFill) }}>
        {BRAND.mark}
      </span>
      <span style={{ fontSize: size * 0.52, fontWeight: 700, marginLeft: size * 0.1, letterSpacing: '0.02em',
        color: onDark ? 'rgba(255,255,255,0.85)' : 'var(--anrix-primary)' }}>
        {BRAND.markSub}
      </span>
    </span>
  );
}
