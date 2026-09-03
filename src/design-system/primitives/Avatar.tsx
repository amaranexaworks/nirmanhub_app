import { IonIcon } from '@ionic/react';
import { checkmarkCircle } from 'ionicons/icons';

/**
 * Real portrait pool (Unsplash CDN, verified). Users without an uploaded photo get a
 * consistent real face derived from their name — a real-user app should never show
 * flat initials circles.
 */
const FACE_IDS = [
  '1507003211169-0a1dd7228f2d', '1500648767791-00dcc994a43e', '1544005313-94ddf0286df2',
  '1531384441138-2736e62e0919', '1506794778202-cad84cf45f1d', '1519085360753-af0119f7cbe7',
  '1502685104226-ee32379fefbe', '1489980557514-251d61e3eeb6', '1508214751196-bcfd4ca60f91',
  '1472099645785-5658abf4ff4e', '1560250097-0b93528c311a', '1573497019940-1c28c88b4f3e',
  '1580489944761-15a19d654956', '1607990281513-2c110a25bd8c', '1552058544-f2b08422138a',
  '1573496359142-b8d87734a5a2',
];

function hash(s: string) {
  let h = 0;
  const str = s || 'user';
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function faceFor(name: string, size: number) {
  const id = FACE_IDS[hash(name) % FACE_IDS.length];
  const px = Math.round(size * 2);
  return `https://images.unsplash.com/photo-${id}?w=${px}&h=${px}&fit=crop&crop=faces&q=70&auto=format`;
}

/** Avatar with a real-photo fallback, online dot, and verified ring. */
export function Avatar({
  name,
  src,
  size = 48,
  online,
  verified,
}: {
  name: string;
  src?: string;
  size?: number;
  online?: boolean;
  verified?: boolean;
}) {
  const photo = src || faceFor(name, size);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `center/cover url(${photo}), var(--anrix-gradient-brand)`,
          border: verified ? '2px solid var(--anrix-info)' : '2px solid transparent',
        }}
      />
      {online && (
        <span
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: size * 0.26,
            height: size * 0.26,
            borderRadius: '50%',
            background: 'var(--anrix-success)',
            border: '2px solid var(--anrix-surface)',
          }}
        />
      )}
      {verified && (
        <IonIcon
          icon={checkmarkCircle}
          style={{
            position: 'absolute',
            right: -2,
            top: -2,
            fontSize: size * 0.32,
            color: 'var(--anrix-info)',
            background: 'var(--anrix-surface)',
            borderRadius: '50%',
          }}
        />
      )}
    </div>
  );
}
