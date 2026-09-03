import { useCallback, useEffect, useRef, useState } from 'react';

export interface HeroSlide {
  /** Background image URL. */
  image?: string;
  /** Fallback background (gradient/color) when no image, or shown behind it. */
  bg?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onClick?: () => void;
}

export interface HeroCarouselProps {
  slides: HeroSlide[];
  /** Slide height in px. */
  height?: number;
  /** Auto-advance interval in ms (0 disables). */
  interval?: number;
}

/**
 * Auto-advancing hero banner carousel (Nobero/Zepto style) — native horizontal
 * swipe via scroll-snap, animated dot indicators, auto-rotate that pauses briefly
 * after the user swipes and respects prefers-reduced-motion.
 */
export function HeroCarousel({ slides, height = 188, interval = 4500 }: HeroCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const pausedUntil = useRef(0);

  const goTo = useCallback((i: number, smooth = true) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Track the active slide as the user scrolls.
  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex((prev) => (prev === i ? prev : i));
  }, []);

  // Auto-advance.
  useEffect(() => {
    if (!interval || slides.length <= 1) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const id = window.setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      const el = scrollerRef.current;
      if (!el || !el.clientWidth) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % slides.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, interval);
    return () => window.clearInterval(id);
  }, [interval, slides.length]);

  const pause = () => {
    pausedUntil.current = Date.now() + (interval || 4500) * 1.6;
  };

  if (!slides.length) return null;

  return (
    <div>
      <div
        ref={scrollerRef}
        className="no-scrollbar"
        onScroll={onScroll}
        onTouchStart={pause}
        onPointerDown={pause}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {slides.map((s, i) => (
          <div
            key={i}
            style={{ flex: '0 0 100%', scrollSnapAlign: 'start', padding: '0 var(--anrix-space-5)' }}
          >
            <div
              onClick={s.onClick}
              className={s.onClick ? 'anrix-pressable' : undefined}
              style={{
                position: 'relative',
                height,
                borderRadius: 'var(--anrix-radius-xl)',
                overflow: 'hidden',
                cursor: s.onClick ? 'pointer' : 'default',
                background: s.bg ?? 'var(--anrix-gradient-brand)',
                backgroundImage: s.image
                  ? `linear-gradient(180deg, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.62) 100%), url(${s.image})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: 'var(--anrix-space-5)',
                color: '#fff',
              }}
            >
              {s.eyebrow && (
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, opacity: 0.9, textTransform: 'uppercase' }}>
                  {s.eyebrow}
                </div>
              )}
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.15, marginTop: 2, maxWidth: '85%' }}>
                {s.title}
              </div>
              {s.subtitle && (
                <div style={{ fontSize: 13, opacity: 0.92, marginTop: 4, maxWidth: '90%' }}>{s.subtitle}</div>
              )}
              {s.ctaLabel && (
                <span
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: 'var(--anrix-space-4)',
                    background: '#fff',
                    color: 'var(--anrix-text-strong)',
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '8px 16px',
                    borderRadius: 'var(--anrix-radius-pill)',
                  }}
                >
                  {s.ctaLabel}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="anrix-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => {
                pause();
                goTo(i);
              }}
              className={`anrix-dot${i === index ? ' is-active' : ''}`}
              style={{ border: 'none', padding: 0, cursor: 'pointer' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
