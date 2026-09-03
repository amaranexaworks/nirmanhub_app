import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { searchOutline, closeCircle } from 'ionicons/icons';
import { AnimatePresence, motion } from 'framer-motion';

interface SearchFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /**
   * Words to cycle through in the placeholder (e.g. ['workers','materials']).
   * Animates while the field is empty. Falls back to `placeholder` if omitted.
   */
  rotatingPlaceholders?: string[];
  /** Leading text shown before the rotating word, e.g. "Search for ". */
  rotatePrefix?: string;
  /** Render as a non-typing button that navigates elsewhere on tap. */
  onClick?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}

const ICON_GAP = 12;

/**
 * App-wide search input. Always a full pill — replaces IonSearchbar, whose
 * shadow DOM ignored our --border-radius override and stayed rectangular.
 */
export function SearchField({
  value,
  onChange,
  placeholder = 'Search',
  rotatingPlaceholders,
  rotatePrefix = 'Search for ',
  onClick,
  onFocus,
  onBlur,
  autoFocus,
  style,
}: SearchFieldProps) {
  const [idx, setIdx] = useState(0);
  const rotating = (rotatingPlaceholders?.length ?? 0) > 0;

  // Advance the rotating word on a timer (only when there's something to rotate).
  useEffect(() => {
    if (!rotating) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const id = window.setInterval(
      () => setIdx((i) => (i + 1) % rotatingPlaceholders!.length),
      2200,
    );
    return () => window.clearInterval(id);
  }, [rotating, rotatingPlaceholders]);

  const shell: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: ICON_GAP,
    height: 48, padding: '0 16px', borderRadius: 999,
    background: 'var(--anrix-surface)', border: '1px solid var(--anrix-border)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)', ...style,
  };

  // Animated placeholder overlay — shown only while the field is empty.
  const rotatingOverlay = rotating && !value && (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
        fontSize: 15,
        fontWeight: 500,
        color: 'var(--anrix-text-muted)',
        overflow: 'hidden',
      }}
    >
      <span style={{ whiteSpace: 'pre' }}>{rotatePrefix}</span>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={rotatingPlaceholders![idx]}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            style={{ display: 'inline-block', whiteSpace: 'nowrap', color: 'var(--anrix-text)' }}
          >
            {rotatingPlaceholders![idx]}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );

  // Tap-through mode (e.g. dashboards) — looks identical, acts as a button.
  if (onClick) {
    return (
      <button onClick={onClick} style={{ ...shell, width: '100%', cursor: 'pointer', textAlign: 'left' }}>
        <IonIcon icon={searchOutline} style={{ fontSize: 20, color: 'var(--anrix-text-muted)', flexShrink: 0 }} />
        <span style={{ position: 'relative', flex: 1, minWidth: 0, height: '100%' }}>
          {rotating ? (
            rotatingOverlay
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', height: '100%', fontSize: 15, fontWeight: 500, color: 'var(--anrix-text-muted)' }}>
              {placeholder}
            </span>
          )}
        </span>
      </button>
    );
  }

  return (
    <div style={shell}>
      <IonIcon icon={searchOutline} style={{ fontSize: 20, color: 'var(--anrix-text-muted)', flexShrink: 0 }} />
      <span style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        {rotatingOverlay}
        <input
          value={value}
          autoFocus={autoFocus}
          placeholder={rotating ? '' : placeholder}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(e) => onChange?.(e.target.value)}
          style={{
            width: '100%', minWidth: 0, border: 'none', outline: 'none',
            background: 'transparent', fontSize: 15, fontWeight: 500, color: 'var(--anrix-text-strong)',
          }}
        />
      </span>
      {value ? (
        <IonIcon
          icon={closeCircle}
          onClick={() => onChange?.('')}
          style={{ fontSize: 18, color: 'var(--anrix-text-muted)', flexShrink: 0, cursor: 'pointer' }}
        />
      ) : null}
    </div>
  );
}
