export interface SectionHeaderProps {
  title: string;
  action?: { label: string; onClick: () => void };
  /** Optional style override (e.g. to tighten the top margin under the search bar). */
  style?: React.CSSProperties;
}

export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        margin: 'var(--anrix-space-4) var(--anrix-space-5) var(--anrix-space-3)',
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: -0.2,
          color: 'var(--anrix-text-strong)',
        }}
      >
        {title}
      </span>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px 0',
            color: 'var(--anrix-primary-strong)',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
