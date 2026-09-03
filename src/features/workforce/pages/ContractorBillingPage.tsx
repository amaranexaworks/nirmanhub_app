import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonModal, IonInput, IonSpinner, IonSegment, IonSegmentButton, IonLabel,
} from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { addOutline, warningOutline, checkmarkCircle } from 'ionicons/icons';
import { workforceApi } from '@services/api/workforceApi';
import { useTranslation } from 'react-i18next';

/**
 * Contractor billing & reconciliation — the anti-cash-leakage screen. A labour
 * contractor's CLAIMED amount is checked against what the muster (verified attendance ×
 * day-rate + OT + their service charge) actually supports. A positive variance is an
 * over-claim and gets flagged in red so it can be disputed before it's paid.
 */

type Contractor = { cntrctr_id: number; nm_tx: string; phone_tx: string | null; svc_chrg_pct: string | number; worker_count: string | number };
type Recon = { cntrctr_id: number; nm_tx: string; svc_chrg_pct: string | number; worker_cnt: number; paid_days_am: string | number; wages_am: string | number; ot_am: string | number; svc_chrg_am: string | number; computed_am: string | number };
type Bill = { bill_id: number; cntrctr_nm: string; period_from_dt: string; period_to_dt: string; worker_cnt: number; computed_am: string | number; claimed_am: string | number | null; variance_am: string | number | null; sts_cd: string };

const num = (v: string | number | null | undefined) => (v == null ? 0 : typeof v === 'number' ? v : parseFloat(v) || 0);
const inr = (v: string | number | null | undefined) => `₹${num(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const monthStart = () => new Date().toISOString().slice(0, 8) + '01';
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_TONE: Record<string, string> = {
  draft: '#6b7280', approved: 'var(--anrix-success, #16a34a)', paid: '#2563eb', disputed: 'var(--anrix-danger, #dc2626)',
};

export function ContractorBillingPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<'reconcile' | 'bills'>('reconcile');
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // add-contractor modal
  const [showAdd, setShowAdd] = useState(false);
  const [cName, setCName] = useState(''); const [cPhone, setCPhone] = useState(''); const [cPct, setCPct] = useState('');

  // reconciliation panel
  const [selId, setSelId] = useState<number | null>(null);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [recon, setRecon] = useState<Recon | null>(null);
  const [claimed, setClaimed] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([workforceApi.contractors(id), workforceApi.contractorBills(id)])
      .then(([c, b]) => { setContractors((c as Contractor[]) || []); setBills((b as Bill[]) || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  useEffect(() => {
    if (selId == null) { setRecon(null); return; }
    let alive = true;
    workforceApi.reconcileContractor(selId, from, to)
      .then((r) => { if (alive) setRecon(r as Recon); })
      .catch(() => { if (alive) setRecon(null); });
    return () => { alive = false; };
  }, [selId, from, to]);

  const variance = useMemo(() => (claimed && recon ? num(claimed) - num(recon.computed_am) : null), [claimed, recon]);

  const addContractor = async () => {
    if (!cName.trim()) return;
    await workforceApi.addContractor(id, { name: cName.trim(), phone: cPhone.trim() || undefined, serviceChargePct: cPct ? Number(cPct) : 0 });
    setShowAdd(false); setCName(''); setCPhone(''); setCPct(''); load();
  };

  const raiseBill = async () => {
    if (selId == null) return;
    setBusy(true);
    try {
      await workforceApi.createContractorBill(id, { contractorId: selId, from, to, claimedAmount: claimed ? Number(claimed) : undefined });
      setClaimed(''); setTab('bills'); load();
    } finally { setBusy(false); }
  };

  const setStatus = async (billId: number, status: 'approved' | 'paid' | 'disputed') => {
    await workforceApi.setContractorBillStatus(billId, status); load();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={`/app/workforce/board/${id}`} /></IonButtons>
          <IonTitle>{t('wf.contractorBilling', 'Contractor Billing')}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => setShowAdd(true)}><IonIcon slot="icon-only" icon={addOutline} /></IonButton></IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={tab} onIonChange={(e) => setTab(e.detail.value as any)}>
            <IonSegmentButton value="reconcile"><IonLabel>{t('wf.reconcile', 'Reconcile')}</IonLabel></IonSegmentButton>
            <IonSegmentButton value="bills"><IonLabel>{t('wf.billsCount', 'Bills ({{n}})', { n: bills.length })}</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading ? (
          <BrandLoader />
        ) : tab === 'reconcile' ? (
          <div style={{ padding: 14 }}>
            {!contractors.length ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--anrix-text-muted)' }}>
                {t('wf.noContractorsYet', 'No contractors yet. Add one with the ＋ button, then attribute workers to them.')}
              </div>
            ) : (
              <>
                {/* pick a contractor */}
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', margin: '2px 2px 8px' }}>{t('wf.contractor', 'Contractor')}</div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
                  {contractors.map((c) => {
                    const on = selId === c.cntrctr_id;
                    return (
                      <button key={c.cntrctr_id} onClick={() => setSelId(c.cntrctr_id)} style={{
                        flexShrink: 0, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                        border: on ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
                        background: on ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)',
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nm_tx}</div>
                        <div style={{ fontSize: 11, color: 'var(--anrix-text-muted)' }}>{num(c.worker_count)} workers · {num(c.svc_chrg_pct)}% svc</div>
                      </button>
                    );
                  })}
                </div>

                {/* period */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <label style={{ flex: 1, fontSize: 12, color: 'var(--anrix-text-muted)' }}>{t('wf.from', 'From')}
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={dateInput} />
                  </label>
                  <label style={{ flex: 1, fontSize: 12, color: 'var(--anrix-text-muted)' }}>{t('wf.to', 'To')}
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={dateInput} />
                  </label>
                </div>

                {selId == null ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--anrix-text-muted)' }}>{t('wf.selectContractorToReconcile', 'Select a contractor to reconcile.')}</div>
                ) : recon ? (
                  <div className="anrix-card" style={{ padding: 16 }}>
                    <Row label={t('wf.musterWages', 'Muster wages ({{workers}} workers · {{days}} man-days)', { workers: recon.worker_cnt, days: num(recon.paid_days_am) })} value={inr(recon.wages_am)} />
                    <Row label={t('wf.overtimeValue', 'Overtime value')} value={inr(recon.ot_am)} />
                    <Row label={t('wf.serviceChargePct', 'Service charge ({{pct}}%)', { pct: num(recon.svc_chrg_pct) })} value={inr(recon.svc_chrg_am)} />
                    <div style={{ borderTop: '1px solid var(--anrix-border)', margin: '10px 0' }} />
                    <Row label={t('wf.systemComputed', 'System-computed (muster truth)')} value={inr(recon.computed_am)} bold />

                    <div style={{ marginTop: 14 }}>
                      <label style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>{t('wf.contractorsClaimedAmount', "Contractor's claimed amount")}</label>
                      <input inputMode="numeric" placeholder={t('wf.claimedAmountPlaceholder', 'e.g. 185000')} value={claimed} onChange={(e) => setClaimed(e.target.value.replace(/[^\d.]/g, ''))} style={{ ...dateInput, fontSize: 16, fontWeight: 700 }} />
                    </div>

                    {variance != null && (
                      <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12,
                        background: variance > 0 ? 'rgba(220,38,38,0.10)' : 'rgba(22,163,74,0.10)',
                        border: `1px solid ${variance > 0 ? 'rgba(220,38,38,0.30)' : 'rgba(22,163,74,0.30)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
                          <IonIcon icon={variance > 0 ? warningOutline : checkmarkCircle} style={{ color: variance > 0 ? 'var(--anrix-danger, #dc2626)' : 'var(--anrix-success, #16a34a)', fontSize: 20 }} />
                          {variance > 0 ? `Over-claim of ${inr(variance)}` : variance < 0 ? `Under-claim of ${inr(Math.abs(variance))}` : 'Exact match'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--anrix-text-muted)', marginTop: 4 }}>
                          {variance > 0 ? t('wf.billClaimsMore', 'The bill claims more than the muster supports — review before paying.') : t('wf.claimWithinMuster', 'Claim is within the muster.')}
                        </div>
                      </div>
                    )}

                    <IonButton expand="block" style={{ marginTop: 14 }} disabled={busy} onClick={raiseBill}>
                      {busy ? <IonSpinner name="dots" /> : t('wf.raiseBillForPeriod', 'Raise bill for this period')}
                    </IonButton>
                  </div>
                ) : (
                  <BrandLoader />
                )}
              </>
            )}
          </div>
        ) : (
          <div style={{ padding: 14 }}>
            {!bills.length ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--anrix-text-muted)' }}>{t('wf.noBillsRaised', 'No bills raised yet.')}</div>
            ) : bills.map((b) => {
              const v = num(b.variance_am);
              const over = b.claimed_am != null && v > 0;
              return (
                <div key={b.bill_id} className="anrix-card" style={{ padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{b.cntrctr_nm}</div>
                      <div style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>{b.period_from_dt} → {b.period_to_dt} · {b.worker_cnt} workers</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: STATUS_TONE[b.sts_cd] }}>{b.sts_cd}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13 }}>
                    <div><span style={{ color: 'var(--anrix-text-muted)' }}>{t('wf.computed', 'Computed')} </span><b>{inr(b.computed_am)}</b></div>
                    <div><span style={{ color: 'var(--anrix-text-muted)' }}>{t('wf.claimed', 'Claimed')} </span><b>{b.claimed_am != null ? inr(b.claimed_am) : '—'}</b></div>
                    {b.claimed_am != null && (
                      <div style={{ color: over ? 'var(--anrix-danger, #dc2626)' : 'var(--anrix-success, #16a34a)', fontWeight: 800 }}>
                        {over ? '▲' : '▼'} {inr(Math.abs(v))}
                      </div>
                    )}
                  </div>
                  {b.sts_cd !== 'paid' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <IonButton size="small" fill="outline" color="danger" onClick={() => setStatus(b.bill_id, 'disputed')}>{t('wf.dispute', 'Dispute')}</IonButton>
                      <IonButton size="small" fill="outline" onClick={() => setStatus(b.bill_id, 'approved')}>{t('wf.approve', 'Approve')}</IonButton>
                      <IonButton size="small" onClick={() => setStatus(b.bill_id, 'paid')}>{t('wf.markPaid', 'Mark paid')}</IonButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* add contractor */}
        <IonModal isOpen={showAdd} onDidDismiss={() => setShowAdd(false)} initialBreakpoint={0.6} breakpoints={[0, 0.6]}>
          <div style={{ padding: 20 }}>
            <h3 style={{ marginTop: 0 }}>{t('wf.addContractor', 'Add contractor')}</h3>
            <IonInput label={t('wf.name', 'Name')} labelPlacement="stacked" value={cName} onIonInput={(e) => setCName(e.detail.value || '')} placeholder={t('wf.labourContractorName', 'Labour contractor name')} />
            <IonInput label={t('wf.phone', 'Phone')} labelPlacement="stacked" value={cPhone} onIonInput={(e) => setCPhone(e.detail.value || '')} placeholder={t('wf.optional', 'Optional')} />
            <IonInput label={t('wf.serviceChargePercent', 'Service charge %')} labelPlacement="stacked" type="number" value={cPct} onIonInput={(e) => setCPct(e.detail.value || '')} placeholder={t('wf.eg8', 'e.g. 8')} />
            <IonButton expand="block" style={{ marginTop: 16 }} disabled={!cName.trim()} onClick={addContractor}>{t('wf.add', 'Add')}</IonButton>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: bold ? 15 : 13.5 }}>
      <span style={{ color: bold ? 'var(--anrix-text)' : 'var(--anrix-text-muted)', fontWeight: bold ? 800 : 500 }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600 }}>{value}</span>
    </div>
  );
}

const dateInput: React.CSSProperties = {
  width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--anrix-border, #e5e7eb)', background: 'var(--anrix-surface, #fff)', fontSize: 14,
};
