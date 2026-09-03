import type { ReactNode } from 'react';

export interface TileRowProps {
  /** Leading visual — an emoji/short string (rendered in a tinted tile) or a ReactNode. */
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Trailing content — a value, a button, or a chevron. */
  trailing?: ReactNode;
  onClick?: () => void;
  /** Render a hairline divider below the row (for stacking rows inside one card). */
  divider?: boolean;
}

/**
 * The canonical list/dashboard row — leading tile, title + subtitle, trailing slot.
 * Used everywhere a "thing with an action/value" appears (payments, bids, cost lines),
 * so every such row across the app reads identically (Zepto/NoBroker list style).
 */
export function TileRow({ leading, title, subtitle, trailing, onClick, divider }: TileRowProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      className={interactive ? 'anrix-pressable' : undefined}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--anrix-space-4)',
        padding: 'var(--anrix-space-4) 0',
        cursor: interactive ? 'pointer' : 'default',
        borderBottom: divider ? '1px solid var(--anrix-border)' : 'none',
      }}
    >
      {leading != null && (
        <div
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: 'var(--anrix-radius-md)',
            background: 'var(--anrix-surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          {leading}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--anrix-text-strong)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        {subtitle != null && (
          <div style={{ fontSize: 13, color: 'var(--anrix-text-muted)', marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      {trailing != null && <div style={{ flexShrink: 0 }}>{trailing}</div>}
    </div>
  );
}
