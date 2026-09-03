import { IonIcon } from '@ionic/react';

export interface PillTab<T extends string = string> {
  key: T;
  label: string;
  icon: string;
}

/**
 * Bordered pill-tab bar — a white rounded container (hairline border + soft
 * shadow) holding icon+label tabs; the active tab is a solid amber pill.
 * Scrolls horizontally when the tabs overflow. Used for section navigation
 * inside a detail screen.
 */
export function PillTabs<T extends string>({
  tabs, value, onChange,
}: {
  tabs: PillTab<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div
      className="no-scrollbar"
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        overflowX: 'auto',
        padding: 6,
        margin: '12px 12px 4px',
        background: 'var(--anrix-surface)',
        border: '1px solid var(--anrix-border-strong)',
        borderRadius: 'var(--anrix-radius-xl)',
        boxShadow: 'var(--anrix-shadow-2)',
      }}
    >
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className="anrix-pressable"
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 40,
              padding: '0 16px',
              borderRadius: 'var(--anrix-radius-lg)',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: -0.1,
              background: active ? 'var(--anrix-primary)' : 'transparent',
              color: active ? 'var(--anrix-on-primary)' : 'var(--anrix-text-strong)',
              boxShadow: active ? '0 4px 12px rgba(245, 179, 1, 0.32)' : 'none',
              transition: 'background var(--anrix-motion-fast), color var(--anrix-motion-fast)',
            }}
          >
            <IonIcon
              icon={t.icon}
              style={{ fontSize: 18, color: active ? 'var(--anrix-on-primary)' : 'var(--anrix-text-muted)' }}
            />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
