import { Fragment } from 'react';

export interface MarqueeBarProps {
  /** Promo / announcement messages, cycled continuously. */
  items: string[];
}

/**
 * Continuously scrolling announcement strip (Nobero/Zepto promo bar).
 * Sits under the header; pauses on hover. Two identical tracks give a seamless loop.
 */
export function MarqueeBar({ items }: MarqueeBarProps) {
  if (!items.length) return null;
  const content = (
    <>
      {items.map((text, i) => (
        <Fragment key={i}>
          <span style={{ padding: '0 18px' }}>{text}</span>
          <span aria-hidden style={{ opacity: 0.5 }}>•</span>
        </Fragment>
      ))}
    </>
  );
  return (
    <div className="anrix-marquee" role="marquee" aria-label={items.join('. ')}>
      <div className="anrix-marquee__track">{content}</div>
      <div className="anrix-marquee__track" aria-hidden>
        {content}
      </div>
    </div>
  );
}
