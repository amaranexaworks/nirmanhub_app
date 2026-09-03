import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/** A simple, reliable touch calculator for on-site sums (no eval — explicit arithmetic). */
export function Calculator() {
  const { t } = useTranslation();
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true); // next digit starts a new number

  const apply = (a: number, b: number, o: string) =>
    o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : o === '÷' ? (b === 0 ? NaN : a / b) : b;

  const inputDigit = (d: string) => {
    if (fresh) { setDisplay(d === '.' ? '0.' : d); setFresh(false); return; }
    if (d === '.' && display.includes('.')) return;
    setDisplay(display.length > 12 ? display : display + d);
  };
  const chooseOp = (o: string) => {
    const cur = parseFloat(display);
    if (prev !== null && op && !fresh) {
      const r = apply(prev, cur, op);
      setPrev(r); setDisplay(fmt(r));
    } else {
      setPrev(cur);
    }
    setOp(o); setFresh(true);
  };
  const equals = () => {
    if (prev === null || !op) return;
    const r = apply(prev, parseFloat(display), op);
    setDisplay(fmt(r)); setPrev(null); setOp(null); setFresh(true);
  };
  const clearAll = () => { setDisplay('0'); setPrev(null); setOp(null); setFresh(true); };
  const back = () => { if (fresh) return; setDisplay(display.length > 1 ? display.slice(0, -1) : '0'); if (display.length <= 1) setFresh(true); };
  const pct = () => { setDisplay(fmt(parseFloat(display) / 100)); setFresh(true); };

  const KEYS: { t: string; fn: () => void; kind?: 'op' | 'fn' | 'eq' }[] = [
    { t: 'C', fn: clearAll, kind: 'fn' }, { t: '⌫', fn: back, kind: 'fn' }, { t: '%', fn: pct, kind: 'fn' }, { t: '÷', fn: () => chooseOp('÷'), kind: 'op' },
    { t: '7', fn: () => inputDigit('7') }, { t: '8', fn: () => inputDigit('8') }, { t: '9', fn: () => inputDigit('9') }, { t: '×', fn: () => chooseOp('×'), kind: 'op' },
    { t: '4', fn: () => inputDigit('4') }, { t: '5', fn: () => inputDigit('5') }, { t: '6', fn: () => inputDigit('6') }, { t: '−', fn: () => chooseOp('−'), kind: 'op' },
    { t: '1', fn: () => inputDigit('1') }, { t: '2', fn: () => inputDigit('2') }, { t: '3', fn: () => inputDigit('3') }, { t: '+', fn: () => chooseOp('+'), kind: 'op' },
    { t: '0', fn: () => inputDigit('0') }, { t: '.', fn: () => inputDigit('.') }, { t: '=', fn: equals, kind: 'eq' },
  ];

  return (
    <div>
      <div style={{ background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', border: '1px solid var(--anrix-hero-border)', boxShadow: 'var(--anrix-hero-shadow)', borderRadius: 16, padding: '20px 18px', textAlign: 'right', marginBottom: 14, minHeight: 78, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ fontSize: 12, color: 'var(--anrix-hero-muted)', height: 16 }}>{prev !== null && op ? `${fmt(prev)} ${op}` : ''}</div>
        <div style={{ fontSize: 38, fontWeight: 800, lineHeight: '44px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{display === 'NaN' ? t('wf.error', 'Error') : display}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {KEYS.map((k) => (
          <button key={k.t} onClick={k.fn}
            style={{
              height: 58, borderRadius: 14, cursor: 'pointer', fontSize: 21, fontWeight: 700,
              gridColumn: k.t === '0' ? 'span 2' : undefined,
              background: k.kind === 'eq' ? 'var(--anrix-primary)' : k.kind === 'op' ? 'var(--anrix-primary-soft)' : k.kind === 'fn' ? 'var(--anrix-surface-2)' : 'var(--anrix-surface)',
              color: k.kind === 'eq' ? '#fff' : k.kind === 'op' ? 'var(--anrix-primary)' : 'var(--anrix-text-strong)',
              border: k.kind === 'eq' || k.kind === 'op' ? 'none' : '1px solid var(--anrix-border)',
            }}>{k.t}</button>
        ))}
      </div>
    </div>
  );
}

/** Trim float noise; keep it readable. */
function fmt(n: number) {
  if (!isFinite(n)) return 'NaN';
  return String(Math.round(n * 1e6) / 1e6);
}
