import type { ReactNode } from 'react';

type Intent = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type StatTone = 'blue' | 'green' | 'amber' | 'violet' | 'rose' | 'teal' | 'slate';

/** Legacy intent → tone, so older callers still get a sensible colour. */
const intentTone: Record<Intent, StatTone> = {
  neutral: 'slate',
  primary: 'amber',
  success: 'green',
  warning: 'amber',
  danger: 'rose',
  info: 'blue',
};

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Legacy — kept for back-compat; drives `tone` when `tone` is not given. */
  intent?: Intent;
  /** Emoji string or an <IonIcon/> element shown in the colored chip. */
  icon?: ReactNode;
  /** Colour theme for the chip + card wash. Defaults from `intent`. */
  tone?: StatTone;
}

/**
 * Dashboard KPI tile — a colourful-but-calm metric card used across every role
 * dashboard (Groww / Zepto / Zoho style): a tinted icon chip, a big bold figure,
 * and a muted label on a soft tonal wash. See docs/05-screens-wireframes.md.
 */
export function StatCard({ label, value, hint, intent, icon, tone }: StatCardProps) {
  const t: StatTone = tone ?? (intent ? intentTone[intent] : 'slate');
  const bg = `var(--anrix-tone-${t}-bg)`;
  const fg = `var(--anrix-tone-${t}-fg)`;
  const line = `var(--anrix-tone-${t}-line)`;

  return (
    <div
      className="anrix-card anrix-pressable"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '13px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 96,
        // Keep more of the tonal colour so the tile reads as a defined, coloured
        // card rather than fading to white — with a clear tinted frame.
        background: `linear-gradient(155deg, ${bg} 0%, ${bg} 34%, var(--anrix-surface) 100%)`,
        border: `1.5px solid ${line}`,
      }}
    >
      {icon != null && (
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            flexShrink: 0,
            background: 'var(--anrix-surface)',
            border: `1.5px solid ${line}`,
            color: fg,
            display: 'grid',
            placeItems: 'center',
            fontSize: 20,
            lineHeight: 1,
            boxShadow: 'var(--anrix-shadow-1)',
          }}
        >
          {icon}
        </span>
      )}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 23,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -0.5,
            color: fg,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--anrix-text-muted)',
            letterSpacing: 0.1,
            marginTop: 3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
          {hint && <span style={{ color: fg, fontWeight: 600 }}> · {hint}</span>}
        </div>
      </div>
    </div>
  );
}
