import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';

/** Count-up number for KPIs / balances. */
export function AnimatedNumber({
  value,
  duration = 0.9,
  prefix = '',
  suffix = '',
  format,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration]);

  const text = format ? format(display) : Math.round(display).toLocaleString('en-IN');
  return (
    <span>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
