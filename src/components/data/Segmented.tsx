/** Lightweight segmented control used across feature list screens. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        margin: '14px 16px 12px',
        background: 'var(--anrix-surface-2)',
        border: '1px solid var(--anrix-border)',
        borderRadius: 'var(--anrix-radius-md)',
      }}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              flex: 1,
              height: 38,
              border: active ? '1.5px solid var(--anrix-primary)' : '1.5px solid transparent',
              borderRadius: 9,
              background: active ? 'var(--anrix-surface)' : 'transparent',
              color: active ? 'var(--anrix-text-strong)' : 'var(--anrix-text-muted)',
              fontWeight: active ? 700 : 600,
              fontSize: 13.5,
              boxShadow: active ? 'var(--anrix-shadow-1)' : 'none',
              cursor: 'pointer',
              transition: 'all var(--anrix-motion-fast)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
