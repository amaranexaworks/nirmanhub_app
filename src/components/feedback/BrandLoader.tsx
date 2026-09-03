import { motion } from 'framer-motion';
import brandLogo from '@assets/brand-logo-square.png';

/**
 * Branded loading animation built from the Nirmanam ribbon logo. The colourful
 * mark sits on a soft rounded tile and gently breathes while a spinning conic
 * gradient ring and a glowing halo sweep around it — an on-brand replacement for
 * a plain spinner.
 *
 * Pass `overlay` to float it as a centred popup (soft backdrop + card) over the
 * content area, instead of an inline top-aligned block — use this when the page
 * would otherwise look blank while data loads.
 */
export function BrandLoader({ size = 88, label, overlay = false }: { size?: number; label?: string; overlay?: boolean }) {
  const ring = size * 1.42; // rotating gradient ring diameter

  const core = (
    <div style={{ display: 'grid', placeItems: 'center', gap: 16, padding: overlay ? 30 : 34 }}>
      <div style={{ position: 'relative', width: ring, height: ring, display: 'grid', placeItems: 'center' }}>
        {/* soft colourful halo that breathes as the logo pulses */}
        <motion.div aria-hidden
          style={{ position: 'absolute', inset: -size * 0.18, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.30), rgba(37,99,235,0.18) 45%, rgba(37,99,235,0) 72%)',
            filter: 'blur(16px)' }}
          animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.94, 1.06, 0.94] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />

        {/* spinning conic-gradient ring, masked to a thin band */}
        <motion.div aria-hidden
          style={{ position: 'absolute', width: ring, height: ring, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #ec4899, #7c3aed, #2563eb, #22d3ee, #ec4899)',
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${size * 0.09}px), #000 calc(100% - ${size * 0.09}px))`,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${size * 0.09}px), #000 calc(100% - ${size * 0.09}px))`,
            opacity: 0.9 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }} />

        {/* logo tile — gentle bob + breathe */}
        <motion.div
          style={{ position: 'relative', width: size, height: size, borderRadius: size * 0.24,
            background: 'radial-gradient(120% 120% at 30% 20%, #ffffff 0%, #f4f6fb 100%)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 12px 30px rgba(60,40,120,0.28)', overflow: 'hidden' }}
          animate={{ y: [0, -5, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
          <img src={brandLogo} alt="" width={size * 0.82} height={size * 0.82}
            style={{ objectFit: 'contain', display: 'block' }} />
        </motion.div>
      </div>
      {label && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--anrix-text-muted)' }}>{label}</div>}
    </div>
  );

  if (!overlay) return core;

  // Centred popup: a soft backdrop dims the content while a rounded card holds the
  // animation, so the wait reads as a deliberate overlay rather than a blank page.
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
      background: 'rgba(22,24,29,0.28)', backdropFilter: 'blur(2px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{ background: 'var(--anrix-surface)', borderRadius: 'var(--anrix-radius-lg)',
          boxShadow: 'var(--anrix-shadow-2, 0 18px 44px rgba(22,24,29,0.24))', border: '1px solid var(--anrix-border)' }}>
        {core}
      </motion.div>
    </div>
  );
}
