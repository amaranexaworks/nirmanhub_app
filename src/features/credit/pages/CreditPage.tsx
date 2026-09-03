import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IonIcon, IonModal, IonToast } from '@ionic/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addOutline, removeOutline, cartOutline, closeOutline, checkmarkCircle, timeOutline, alertCircleOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Reveal } from '@components/motion';
import { Segmented } from '@components/data/Segmented';
import { Badge, GradientButton } from '@design/primitives';
import { creditApi } from '@services/api/creditApi';
import { materialsApi } from '@services/api/materialsApi';
import { TENURES, daysLeft, type OrderItem } from '../store/creditStore';

const rupee = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const CREDIT_LIMIT = 200000; // sanctioned line (business rule)

const fmtDate = (ts?: string) => (ts ? new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');

export function CreditPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'outstanding' | 'paid'>('outstanding');
  const [shop, setShop] = useState(false);
  const [toast, setToast] = useState('');

  // order builder
  const [qty, setQty] = useState<Record<string, number>>({});
  const [tenure, setTenure] = useState<number>(15);

  // Buyable materials come from the live catalog (no hardcoded list).
  const { data: materials = [] } = useQuery({
    queryKey: ['materials', 'shop'],
    queryFn: async () => (await materialsApi.catalog({ limit: 200 })).map((p: any) => ({
      name: p.nm_tx, emoji: p.emoji_tx || '📦', unit: p.unit_tx || 'unit',
      price: Number(p.price_am), vendor: p.vndr_nm || p.ctgry_nm || 'Marketplace',
    })),
  });

  const { data: rawOrders = [] } = useQuery({ queryKey: ['credit', 'orders'], queryFn: () => creditApi.orders() });
  const orders = rawOrders.map((o: any) => ({
    id: String(o.ordr_id), vendor: o.vndr_tx || 'Vendor', total: Number(o.ttl_am), tenureDays: o.tenure_days,
    dueISO: o.due_ts, status: o.sts_cd as 'due' | 'paid', orderedAt: fmtDate(o.ordrd_ts), paidAt: fmtDate(o.paid_ts), itemCount: Number(o.item_count) || 0,
  }));

  const due = orders.filter((o) => o.status === 'due');
  const paid = orders.filter((o) => o.status === 'paid');
  const used = due.reduce((s, o) => s + o.total, 0);
  const available = Math.max(0, CREDIT_LIMIT - used);
  const creditLimit = CREDIT_LIMIT;

  const cart = useMemo(() => materials
    .filter((m) => (qty[m.name] ?? 0) > 0)
    .map<OrderItem>((m) => ({ name: m.name, emoji: m.emoji, unit: m.unit, qty: qty[m.name], price: m.price })),
    [qty, materials]);
  const cartTotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const overLimit = cartTotal > available;

  const setQ = (name: string, d: number) => setQty((q) => ({ ...q, [name]: Math.max(0, (q[name] ?? 0) + d) }));
  const invalidate = () => qc.invalidateQueries({ queryKey: ['credit', 'orders'] });

  const createMut = useMutation({
    mutationFn: (vars: { vendor: string; items: OrderItem[] }) => creditApi.create({ vendor: vars.vendor, tenureDays: tenure, items: vars.items }),
    onSuccess: () => { invalidate(); setQty({}); setShop(false); setToast(t('credit.orderedOnCredit', 'Ordered on credit · repay in {{days}} days', { days: tenure })); },
    onError: (e: any) => setToast(e.message || t('credit.couldNotPlaceOrder', 'Could not place order')),
  });
  const repayMut = useMutation({
    mutationFn: (id: string) => creditApi.pay(id),
    onSuccess: () => { invalidate(); setToast(t('credit.repaidRestored', 'Repaid ✓ credit restored')); },
    onError: (e: any) => setToast(e.message || t('credit.couldNotRepay', 'Could not repay')),
  });
  const repay = (id: string) => repayMut.mutate(id);

  const confirm = () => {
    if (!cart.length || overLimit) return;
    const vendor = cart.length === 1 ? (materials.find((m) => m.name === cart[0].name)?.vendor ?? 'Marketplace') : `${cart.length} vendors`;
    createMut.mutate({ vendor, items: cart });
  };

  return (
    <PageShell title={t('credit.materialCredit', 'Material Credit')} showBack footer={<GradientButton icon={cartOutline} onClick={() => setShop(true)}>{t('credit.buyMaterialsPayLater', 'Buy materials · Pay later')}</GradientButton>}>
      <AnimatedPage>
        <div style={{ padding: '4px 16px 16px' }}>
          {/* Credit limit card */}
          <Reveal>
            <div style={{ padding: 12, borderRadius: 'var(--anrix-radius-xl)', background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', border: '1px solid var(--anrix-hero-border)', boxShadow: 'var(--anrix-hero-shadow)', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 13 }}>{t('credit.availableCredit', 'Available credit')}</div>
                <Badge tone="success">{t('credit.sanctioned', 'Sanctioned')}</Badge>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--anrix-hero-accent)' }}>{rupee(available)}</div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--anrix-hero-chip)', overflow: 'hidden', marginTop: 10 }}>
                <div style={{ width: `${(used / creditLimit) * 100}%`, height: '100%', background: 'var(--anrix-primary)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--anrix-hero-muted)' }}>
                <span>{t('credit.used', 'Used')} {rupee(used)}</span>
                <span>{t('credit.limit', 'Limit')} {rupee(creditLimit)}</span>
              </div>
            </div>
          </Reveal>

          <Segmented value={tab} onChange={setTab} options={[{ key: 'outstanding', label: t('credit.toRepay', 'To repay ({{count}})', { count: due.length }) }, { key: 'paid', label: t('credit.repaid', 'Repaid') }]} />

          {tab === 'outstanding' && (
            <>
              {due.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--anrix-text-muted)' }}>{t('credit.noPendingDues', 'No pending dues 🎉')}</div>}
              {due.map((o) => {
                const dl = daysLeft(o.dueISO);
                const overdue = dl < 0;
                return (
                  <div key={o.id} className="anrix-card" style={{ marginBottom: 10, padding: 14, borderColor: overdue ? 'var(--anrix-danger)' : 'var(--anrix-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>{o.itemCount > 1 ? t('credit.itemCountPlural', '{{count}} items', { count: o.itemCount }) : t('credit.itemCount', '{{count}} item', { count: o.itemCount })}</div>
                        <div className="anrix-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{o.vendor} · {t('credit.ordered', 'ordered')} {o.orderedAt}</div>
                      </div>
                      <strong style={{ fontSize: 16 }}>{rupee(o.total)}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--anrix-border)' }}>
                      <IonIcon icon={overdue ? alertCircleOutline : timeOutline} style={{ color: overdue ? 'var(--anrix-danger)' : 'var(--anrix-warning)' }} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: overdue ? 'var(--anrix-danger)' : 'var(--anrix-text)' }}>
                        {overdue ? t('credit.overdueBy', 'Overdue by {{days}} days', { days: Math.abs(dl) }) : (dl === 1 ? t('credit.dueInDay', 'Due in {{days}} day', { days: dl }) : t('credit.dueInDays', 'Due in {{days}} days', { days: dl }))}
                      </span>
                      <GradientButton full={false} onClick={() => { repay(o.id); setToast(t('credit.repaidRestored', 'Repaid ✓ credit restored')); }} style={{ marginLeft: 'auto', width: 120, height: 38 }}>{t('credit.repay', 'Repay')}</GradientButton>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === 'paid' && (
            <>
              {paid.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--anrix-text-muted)' }}>{t('credit.noRepaidOrders', 'No repaid orders yet.')}</div>}
              {paid.map((o) => (
                <div key={o.id} className="anrix-card" style={{ marginBottom: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <IonIcon icon={checkmarkCircle} style={{ color: 'var(--anrix-success)', fontSize: 24 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{o.itemCount > 1 ? t('credit.itemCountPlural', '{{count}} items', { count: o.itemCount }) : t('credit.itemCount', '{{count}} item', { count: o.itemCount })}</div>
                    <div className="anrix-muted" style={{ fontSize: 12 }}>{o.vendor} · {t('credit.repaidLower', 'repaid')} {o.paidAt}</div>
                  </div>
                  <strong>{rupee(o.total)}</strong>
                </div>
              ))}
            </>
          )}
        </div>
      </AnimatedPage>

      {/* ---- Order builder ---- */}
      <IonModal isOpen={shop} onDidDismiss={() => setShop(false)} initialBreakpoint={0.92} breakpoints={[0, 0.92, 1]}>
        <div style={{ padding: 18, maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{t('credit.orderOnCredit', 'Order on credit')}</h2>
            <button onClick={() => setShop(false)} style={{ background: 'var(--anrix-surface-2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
            </button>
          </div>

          {materials.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--anrix-text-muted)', fontSize: 13.5 }}>{t('credit.loadingMaterials', 'Loading materials…')}</div>
          )}
          {materials.map((m) => {
            const q = qty[m.name] ?? 0;
            return (
              <div key={m.name} className="anrix-card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                <span style={{ fontSize: 24 }}>{m.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                  <div className="anrix-muted" style={{ fontSize: 12 }}>₹{m.price}/{m.unit} · {m.vendor}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setQ(m.name, -10)} style={step}><IonIcon icon={removeOutline} /></button>
                  <span style={{ minWidth: 34, textAlign: 'center', fontWeight: 800 }}>{q}</span>
                  <button onClick={() => setQ(m.name, 10)} style={step}><IonIcon icon={addOutline} /></button>
                </div>
              </div>
            );
          })}

          {/* tenure */}
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--anrix-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '16px 0 8px' }}>{t('credit.repayAfter', 'Repay after')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {TENURES.map((tn) => {
              const on = tenure === tn;
              return (
                <button key={tn} onClick={() => setTenure(tn)} style={{
                  flex: 1, height: 44, borderRadius: 12, fontWeight: 700, cursor: 'pointer',
                  border: on ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
                  background: on ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)', color: on ? 'var(--anrix-primary)' : 'var(--anrix-text)',
                }}>{t('credit.days', '{{count}} days', { count: tn })}</button>
              );
            })}
          </div>

          {/* summary */}
          <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: 'var(--anrix-surface-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="anrix-muted">{t('credit.orderTotal', 'Order total')}</span><strong>{rupee(cartTotal)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 13 }}><span className="anrix-muted">{t('credit.availableCredit', 'Available credit')}</span><span style={{ color: overLimit ? 'var(--anrix-danger)' : 'var(--anrix-success)', fontWeight: 700 }}>{rupee(available)}</span></div>
            {overLimit && <div style={{ color: 'var(--anrix-danger)', fontSize: 12.5, marginTop: 6 }}>{t('credit.exceedsCredit', 'Exceeds available credit. Reduce the order or repay dues first.')}</div>}
          </div>

          <div style={{ marginTop: 16 }}>
            <GradientButton disabled={!cart.length || overLimit} onClick={confirm}>
              {cart.length ? t('credit.confirmPayIn', 'Confirm · {{total}} · pay in {{days}}d', { total: rupee(cartTotal), days: tenure }) : t('credit.addMaterials', 'Add materials')}
            </GradientButton>
          </div>
        </div>
      </IonModal>

      <IonToast isOpen={!!toast} message={toast} duration={1500} onDidDismiss={() => setToast('')} />
    </PageShell>
  );
}

const step: React.CSSProperties = { width: 32, height: 32, borderRadius: 9, border: '1.5px solid var(--anrix-primary)', background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 16 };
