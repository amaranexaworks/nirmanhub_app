import authBg from '@assets/auth-bg.png';

/**
 * Construction-site backdrop behind the auth header (login + signup) — a hazy skyline
 * of buildings under construction with golden tower cranes and a soft sun top-right.
 * It's a real illustration (src/assets/auth-bg.png) that already fades to near-white at
 * the bottom, so it dissolves naturally into the white form card. Pinned to the top and
 * scaled to the screen width so the edge cranes stay visible on every device. Decorative.
 */
export function ConstructionBackdrop() {
  return (
    <div
      aria-hidden
      style={{ position: 'fixed', top: 0, left: 0, right: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}
    >
      <img
        src={authBg}
        alt=""
        style={{
          width: '100%', height: 'auto', display: 'block',
          // Feather the very bottom edge so the image's white blends seamlessly into the page.
          WebkitMaskImage: 'linear-gradient(180deg, #000 88%, transparent 100%)',
          maskImage: 'linear-gradient(180deg, #000 88%, transparent 100%)',
        }}
      />
    </div>
  );
}
