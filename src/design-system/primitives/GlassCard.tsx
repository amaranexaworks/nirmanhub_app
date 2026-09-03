import type { CSSProperties, ReactNode } from 'react';

/** Frosted-glass surface for overlays on gradients (auth, hero headers). */
export function GlassCard({
  children,
  style,
  padding = 20,
}: {
  children: ReactNode;
  style?: CSSProperties;
  padding?: number;
}) {
  return (
    <div
      style={{
        background: 'var(--anrix-glass-bg)',
        border: '1px solid var(--anrix-glass-border)',
        borderRadius: 'var(--anrix-radius-xl)',
        backdropFilter: 'blur(var(--anrix-glass-blur))',
        WebkitBackdropFilter: 'blur(var(--anrix-glass-blur))',
        boxShadow: '0 20px 50px rgba(0,0,0,0.28)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
