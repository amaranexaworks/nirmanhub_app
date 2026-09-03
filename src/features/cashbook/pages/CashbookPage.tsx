import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonIcon, IonModal, IonInput, IonTextarea, IonSpinner, IonButton,
} from '@ionic/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addOutline, closeOutline, trashOutline } from 'ionicons/icons';
import { cashbookApi, type CashKind, type CashTxn } from '@services/api/cashbookApi';
import { haptic } from '@lib/haptics';

/**
 * Site Cashbook — the supervisor's day book for one project: Payment In / Out, Expense,
 * Petty Cash, with a running "cash in hand". Per-site and owner-scoped (backend enforced).
 */

const num = (v: any) => (v == null ? 0 : typeof v === 'number' ? v : parseFloat(v) || 0);
const inr = (v: any) => `₹${num(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const thisMonth = () => new Date().toISOString().slice(0, 7);

const KINDS: { key: CashKind; label: string; emoji: string; dir: 'in' | 'out'; tone: string }[] = [
  { key: 'payment_in',  label: 'Payment In',  emoji: '⬇️', dir: 'in',  tone: '#16a34a' },
  { key: 'payment_out', label: 'Payment Out', emoji: '⬆️', dir: 'out', tone: '#dc2626' },
  { key: 'expense',     label: 'Expense',     emoji: '🧾', dir: 'out', tone: '#dc2626' },
  { key: 'petty_cash',  label: 'Petty Cash',  emoji: '💸', dir: 'out', tone: '#d97706' },
];
const kindMeta = (k: CashKind) => KINDS.find((x) => x.key === k) || KINDS[0];

// Day label: Today / Yesterday / "12 Mar" for grouping the ledger.
function dayLabel(dt: string): string {
  const d = new Date(dt + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export function CashbookPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [month] = useState(thisMonth());
  const [filter, setFilter] = useState<CashKind | 'all'>('all');

  const summaryQ = useQuery({ queryKey: ['cashbook', id, 'summary', month], queryFn: () => cashbookApi.summary(id, month) });
  const listQ = useQuery({
    queryKey: ['cashbook', id, 'list', month, filter],
    queryFn: () => cashbookApi.list(id, { month, ...(filter !== 'all' ? { kind: filter } : {}) }),
  });

  // add-transaction sheet
  const [showAdd, setShowAdd] = useState(false);
  const [kind, setKind] = useState<CashKind>('payment_in');
  const [amount, setAmount] = useState('');
  const [party, setParty] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const resetForm = () => { setKind('payment_in'); setAmount(''); setParty(''); setTitle(''); setNote(''); };
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['cashbook', id] }); };

  const addMut = useMutation({
    mutationFn: () => cashbookApi.add(id, { kind, amount: num(amount), party: party.trim() || undefined, title: title.trim() || undefined, note: note.trim() || undefined }),
    onSuccess: () => { void haptic.medium(); invalidate(); setShowAdd(false); resetForm(); },
  });
  const delMut = useMutation({
    mutationFn: (cbkId: number) => cashbookApi.remove(id, cbkId),
    onSuccess: () => { void haptic.light(); invalidate(); },
  });

  const s = summaryQ.data;
  const txns = listQ.data ?? [];

  // Group the ledger by day for the Today / Yesterday / date sections.
  const groups = useMemo(() => {
    const map = new Map<string, CashTxn[]>();
    for (const t of txns) { const k = t.txn_dt; (map.get(k) || map.set(k, []).get(k)!).push(t); }
    return Array.from(map.entries()); // already newest-first from the API
  }, [txns]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={`/app/workforce/board/${id}`} /></IonButtons>
          <IonTitle>Cashbook</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: '14px 14px 96px', maxWidth: 640, margin: '0 auto' }}>

          {/* Cash-in-hand card */}
          <div style={{ borderRadius: 16, padding: 18, background: 'var(--anrix-surface)', border: '1px solid var(--anrix-border)', boxShadow: '0 6px 18px rgba(20,23,28,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, color: 'var(--anrix-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              💰 Cash in hand
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, marginTop: 4, color: num(s?.cashInHand) < 0 ? '#dc2626' : 'var(--anrix-text-strong)' }}>
              {summaryQ.isLoading ? '…' : inr(s?.cashInHand)}
            </div>
            <div style={{ height: 1, background: 'var(--anrix-border)', margin: '14px 0' }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--anrix-text-muted)', textTransform: 'uppercase' }}>This month · In</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#16a34a' }}>↗ {inr(s?.monthIn)}</div>
              </div>
              <div style={{ width: 1, background: 'var(--anrix-border)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--anrix-text-muted)', textTransform: 'uppercase' }}>This month · Out</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#dc2626' }}>↘ {inr(s?.monthOut)}</div>
              </div>
            </div>
          </div>

          {/* Type filter chips */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '14px 0 6px' }}>
            {(['all', ...KINDS.map((k) => k.key)] as const).map((key) => {
              const on = filter === key;
              const label = key === 'all' ? 'All' : kindMeta(key as CashKind).label;
              return (
                <button key={key} onClick={() => setFilter(key as any)} style={{
                  flexShrink: 0, padding: '7px 13px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  border: on ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
                  background: on ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)',
                  color: on ? 'var(--anrix-primary-strong)' : 'var(--anrix-text)',
                }}>{label}</button>
              );
            })}
          </div>

          {/* Ledger grouped by day */}
          {listQ.isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><IonSpinner /></div>
          ) : groups.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--anrix-text-muted)', padding: '48px 0', fontSize: 14 }}>
              No transactions yet. Tap <b>Add Transaction</b> to start the cashbook.
            </div>
          ) : groups.map(([dt, rows]) => (
            <div key={dt} style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--anrix-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 2px 8px' }}>{dayLabel(dt)}</div>
              <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)' }}>
                {rows.map((t, i) => {
                  const m = kindMeta(t.kind_cd);
                  return (
                    <div key={t.cbk_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i ? '1px solid var(--anrix-border)' : 'none' }}>
                      <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 18, background: 'var(--anrix-surface-2)' }}>{m.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--anrix-text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.ttl_tx || m.label}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--anrix-text-muted)' }}>{[t.party_tx, timeOf(t.i_ts)].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 14.5, color: m.dir === 'in' ? '#16a34a' : '#dc2626' }}>{m.dir === 'in' ? '+ ' : '− '}{inr(t.amt_am)}</div>
                        <button onClick={() => delMut.mutate(t.cbk_id)} aria-label="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--anrix-text-muted)' }}>
                          <IonIcon icon={trashOutline} style={{ fontSize: 15 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Add Transaction — floating action button */}
        <button onClick={() => { setShowAdd(true); void haptic.light(); }} style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(env(safe-area-inset-bottom) + 18px)',
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(180deg, #f7bd1a 0%, #f5b301 100%)', color: 'var(--anrix-on-primary, #15171c)', fontWeight: 800, fontSize: 15,
          boxShadow: '0 10px 24px rgba(245,179,1,0.4)', zIndex: 20,
        }}>
          <IonIcon icon={addOutline} style={{ fontSize: 20 }} /> Add Transaction
        </button>

        {/* Add sheet */}
        <IonModal isOpen={showAdd} onDidDismiss={() => setShowAdd(false)} initialBreakpoint={0.92} breakpoints={[0, 0.92]}>
          <IonContent>
            <div style={{ padding: '18px 18px calc(env(safe-area-inset-bottom) + 18px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900 }}>Add Transaction</h2>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><IonIcon icon={closeOutline} style={{ fontSize: 24, color: 'var(--anrix-text-muted)' }} /></button>
              </div>

              {/* Kind picker */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {KINDS.map((k) => {
                  const on = kind === k.key;
                  return (
                    <button key={k.key} onClick={() => setKind(k.key)} style={{
                      padding: '11px 12px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14, textAlign: 'left',
                      border: on ? `1.5px solid ${k.tone}` : '1.5px solid var(--anrix-border)',
                      background: on ? `color-mix(in srgb, ${k.tone} 10%, transparent)` : 'var(--anrix-surface)',
                      color: on ? k.tone : 'var(--anrix-text-strong)', display: 'flex', alignItems: 'center', gap: 8,
                    }}>{k.emoji} {k.label}</button>
                  );
                })}
              </div>

              <label style={lbl}>Amount (₹)</label>
              <IonInput type="number" inputmode="decimal" value={amount} onIonInput={(e) => setAmount(String(e.detail.value ?? ''))} placeholder="0" style={fieldStyle} />
              <label style={lbl}>Party (who paid / was paid)</label>
              <IonInput value={party} onIonInput={(e) => setParty(String(e.detail.value ?? ''))} placeholder="e.g. Jai Prakash" style={fieldStyle} />
              <label style={lbl}>Title</label>
              <IonInput value={title} onIonInput={(e) => setTitle(String(e.detail.value ?? ''))} placeholder="e.g. Cement, Advance" style={fieldStyle} />
              <label style={lbl}>Note (optional)</label>
              <IonTextarea value={note} onIonInput={(e) => setNote(String(e.detail.value ?? ''))} autoGrow rows={2} style={fieldStyle} />

              <IonButton expand="block" disabled={!(num(amount) > 0) || addMut.isPending} onClick={() => addMut.mutate()} style={{ marginTop: 16, '--background': '#f5b301', '--color': 'var(--anrix-on-primary, #15171c)', fontWeight: 800 } as any}>
                {addMut.isPending ? <IonSpinner name="dots" /> : `Add ${kindMeta(kind).label}`}
              </IonButton>
              {addMut.isError && <p style={{ color: '#dc2626', textAlign: 'center', fontSize: 13, marginTop: 10 }}>{(addMut.error as Error)?.message || 'Could not add'}</p>}
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 11.5, fontWeight: 800, color: 'var(--anrix-primary-strong)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 2px 6px' };
const fieldStyle = { '--background': 'var(--anrix-surface-2)', '--padding-start': '12px', '--padding-end': '12px', borderRadius: 12, border: '1px solid var(--anrix-border)' } as any;
