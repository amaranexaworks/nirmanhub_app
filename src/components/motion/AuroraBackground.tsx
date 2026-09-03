import { motion } from 'framer-motion';

/**
 * Professional charcoal backdrop for splash/auth: a deep slate base with ONE
 * soft, slowly-breathing orange glow. Single hue — no rainbow. GPU-only.
 */
export function AuroraBackground({ children }: { children?: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background:
          'radial-gradient(120% 90% at 50% -10%, #23262e 0%, #15171c 45%, #0e0f13 100%)',
      }}
    >
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-12%',
          left: '50%',
          x: '-50%',
          width: 460,
          height: 460,
          borderRadius: '50%',
          background: 'rgba(22, 24, 29, 0.28)',
          filter: 'blur(90px)',
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.8, 0.55] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* faint structural grid for an engineering/blueprint feel */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(80% 60% at 50% 30%, #000 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(80% 60% at 50% 30%, #000 0%, transparent 80%)',
        }}
      />
      <div style={{ position: 'relative', height: '100%' }}>{children}</div>
    </div>
  );
}
