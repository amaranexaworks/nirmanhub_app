import { IonIcon } from '@ionic/react';
import { star, starHalf, starOutline } from 'ionicons/icons';

/** Compact rating: stars + numeric + optional count. */
export function RatingStars({
  value,
  count,
  size = 14,
  showNumber = true,
}: {
  value: number;
  count?: number;
  size?: number;
  showNumber?: boolean;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ display: 'inline-flex' }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const icon = value >= i + 1 ? star : value >= i + 0.5 ? starHalf : starOutline;
          return <IonIcon key={i} icon={icon} style={{ fontSize: size, color: '#F5A623' }} />;
        })}
      </span>
      {showNumber && <strong style={{ fontSize: size - 1 }}>{value.toFixed(1)}</strong>}
      {count != null && (
        <span style={{ fontSize: size - 2, color: 'var(--anrix-text-muted)' }}>({count})</span>
      )}
    </span>
  );
}
