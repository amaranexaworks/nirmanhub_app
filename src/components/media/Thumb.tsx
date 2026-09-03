import { useState } from 'react';

/**
 * A square photo thumbnail with a graceful fallback. If the image is missing or
 * fails to load, it renders a warm gold tile with the emoji glyph — so the UI
 * always shows a real image where one exists, and never a broken-image icon.
 */
export function Thumb({ img, emoji, size = 44, radius = 13 }: {
  img?: string; emoji?: string; size?: number; radius?: number;
}) {
  const [ok, setOk] = useState(true);
  if (!img || !ok) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, display: 'grid', placeItems: 'center',
        background: 'linear-gradient(135deg, #f3e6c4, #e7d3a6)', fontSize: size * 0.5 }}>{emoji || '🛠️'}</div>
    );
  }
  return (
    <img src={img} alt="" loading="lazy" onError={() => setOk(false)}
      style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flexShrink: 0, background: '#e7d3a6' }} />
  );
}
