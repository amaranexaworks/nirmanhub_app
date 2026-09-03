import { IonIcon } from '@ionic/react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  /** Coaching copy — empty states should teach the next action, not just say "nothing here". */
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** Secondary hint rows shown under the message (e.g. "what you can do here"). */
  hints?: { icon: string; text: string }[];
  children?: ReactNode;
}

/**
 * The canonical empty state — a tinted icon badge, a clear title, coaching copy,
 * and one primary action. An empty screen is an invitation to act, never a dead end.
 */
export function EmptyState({ icon, title, message, ctaLabel, onCta, hints, children }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: 'var(--anrix-space-9) var(--anrix-space-6) var(--anrix-space-7)',
        gap: 'var(--anrix-space-3)',
      }}
    >
      {icon && (
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            background: 'var(--anrix-primary-soft)',
            display: 'grid',
            placeItems: 'center',
            marginBottom: 'var(--anrix-space-2)',
          }}
        >
          <IonIcon icon={icon} style={{ fontSize: 34, color: 'var(--anrix-primary-strong)' }} />
        </div>
      )}
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--anrix-text-strong)' }}>{title}</h3>
      {message && (
        <p style={{ margin: 0, color: 'var(--anrix-text-muted)', fontSize: 14, lineHeight: 1.5, maxWidth: 300 }}>{message}</p>
      )}

      {hints && hints.length > 0 && (
        <div style={{ width: '100%', maxWidth: 320, marginTop: 'var(--anrix-space-3)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hints.map((h, i) => (
            <div
              key={i}
              className="anrix-card"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', textAlign: 'left' }}
            >
              <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--anrix-surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <IonIcon icon={h.icon} style={{ fontSize: 17, color: 'var(--anrix-primary-strong)' }} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--anrix-text)' }}>{h.text}</span>
            </div>
          ))}
        </div>
      )}

      {children}

      {ctaLabel && (
        <button
          onClick={onCta}
          className="anrix-pressable"
          style={{
            marginTop: 'var(--anrix-space-4)',
            height: 48,
            padding: '0 28px',
            borderRadius: 'var(--anrix-radius-md)',
            border: 'none',
            background: 'var(--anrix-primary)',
            color: 'var(--anrix-on-primary)',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(245, 179, 1, 0.28)',
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
