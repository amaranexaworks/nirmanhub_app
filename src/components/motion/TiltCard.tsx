import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

/**
 * Premium 3D tilt: the card rotates toward the pointer with a soft spring and a
 * moving sheen. GPU-only (transform), respects reduced-motion via CSS guard.
 */
export function TiltCard({
  children,
  max = 12,
  className,
  style,
  onPress,
}: {
  children: ReactNode;
  max?: number;
  className?: string;
  style?: React.CSSProperties;
  onPress?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 250, damping: 20 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 250, damping: 20 });
  const sheenX = useTransform(px, [0, 1], ['0%', '100%']);

  const handleMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };

  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      onPointerUp={() => onPress?.()}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        transformStyle: 'preserve-3d',
        position: 'relative',
        overflow: 'hidden',
        cursor: onPress ? 'pointer' : undefined,
        ...style,
      }}
      whileTap={{ scale: 0.985 }}
    >
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
          left: sheenX,
          opacity: 0.6,
        }}
      />
      {children}
    </motion.div>
  );
}
