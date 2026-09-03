import type { ReactNode } from 'react';
import { IonIcon } from '@ionic/react';

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const tones: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: 'var(--anrix-primary-soft)', fg: 'var(--anrix-primary-strong)' },
  success: { bg: 'rgba(31,169,113,0.14)', fg: 'var(--anrix-success)' },
  warning: { bg: 'rgba(230,167,0,0.16)', fg: 'var(--anrix-warning)' },
  danger: { bg: 'rgba(229,72,77,0.14)', fg: 'var(--anrix-danger)' },
  info: { bg: 'rgba(91,100,114,0.14)', fg: 'var(--anrix-info)' },
  neutral: { bg: 'var(--anrix-surface-2)', fg: 'var(--anrix-text-muted)' },
};

export function Badge({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: string;
}) {
  const t = tones[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 9px',
        borderRadius: 'var(--anrix-radius-pill)',
        background: t.bg,
        color: t.fg,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
      {icon && <IonIcon icon={icon} style={{ fontSize: 13 }} />}
      {children}
    </span>
  );
}
