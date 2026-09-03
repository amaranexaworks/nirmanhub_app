import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IonIcon, IonModal, IonToast } from '@ionic/react';
import {
  searchOutline, closeOutline, cashOutline, peopleOutline, documentTextOutline, shieldCheckmarkOutline,
  cloudUploadOutline, receiptOutline, printOutline, checkmarkCircle, walletOutline, downloadOutline,
} from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { Avatar, Badge, GradientButton } from '@design/primitives';
import { LocationField } from '@components/form/LocationField';
import { SyncStatusPill } from '@components/feedback/SyncStatusPill';
import { useAuthStore } from '@stores/authStore';
import { useWorkforceStore } from '@features/workforce/store/workforceStore';
import { usePaymentsStore, PAY_METHODS, methodMeta, paidForWorker, adjustmentsForWorker, netAdjustment, ADJUSTMENT_META, type PayMethod, type Payment, type AdjustmentKind } from '../store/paymentsStore';
import type { ManagedWorker } from '@features/workforce/store/workforceStore';
import { PayLogo, UPI_OPTIONS } from '../components/PayLogo';

/** A payment row before the store stamps id/receiptNo/status/audit fields. */
type NewRow = Omit<Payment, 'id' | 'receiptNo' | 'status' | 'createdBy' | 'createdAt' | 'ts'>;
/** What the single-payment modal returns — caller fills in projectId/workerId. */
type ModalRow = Omit<NewRow, 'projectId' | 'workerId'>;

const rupee = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const TABS = [
  { key: 'ledgers', label: 'Ledgers', icon: peopleOutline },
  { key: 'payments', label: 'Payments', icon: cashOutline },
  { key: 'reports', label: 'Reports', icon: documentTextOutline },
  { key: 'audit', label: 'Audit', icon: shieldCheckmarkOutline },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export function WageRegisterPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const me = { user: user?.name ?? 'Member', role: user?.activeRole ?? 'contractor' };

  const { workers: allWorkers, overtime, attendance, advances, activeProjectId, updateWorker } = useWorkforceStore();
  const { payments, adjustments, audit, recordPayments, addAdjustment, voidAdjustment } = usePaymentsStore();
  const workers = allWorkers.filter((w) => w.projectId === activeProjectId);

  const [tab, setTab] = useState<TabKey>('ledgers');
  const [search, setSearch] = useState('');
  const [payWorker, setPayWorker] = useState<string | null>(null);
  const [repOpen, setRepOpen] = useState(false);
  const [ledgerWorker, setLedgerWorker] = useState<string | null>(null);
  const [masterWorker, setMasterWorker] = useState<string | null>(null);
  const [adjFor, setAdjFor] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [toast, setToast] = useState('');

  // ---- wage maths (earnings come from the workforce store; payments owned here) ----
  const daysWorked = (wid: string) => Object.values(attendance).reduce((s, d) => s + (d[wid] === 'P' ? 1 : d[wid] === 'H' ? 0.5 : 0), 0);
  const otHours = (wid: string) => Object.values(overtime).reduce((s, d) => s + (d[wid] ?? 0), 0);
  const earnedOf = (w: { id: string; dayRate: number }) => Math.round(daysWorked(w.id) * w.dayRate + otHours(w.id) * (w.dayRate / 8) * 1.5);
  const advanceOf = (wid: string) => advances.filter((a) => a.workerId === wid).reduce((s, a) => s + a.amount, 0);
  const paidOf = (wid: string) => paidForWorker(payments, wid).reduce((s, p) => s + p.amount, 0);
  const adjOf = (wid: string) => netAdjustment(adjustments, wid); // +bonus/incentive, −penalty/deduction
  const pendingOf = (w: { id: string; dayRate: number }) => Math.max(0, earnedOf(w) + adjOf(w.id) - advanceOf(w.id) - paidOf(w.id));

  const wList = workers.filter((w) => !search || w.name.toLowerCase().includes(search.toLowerCase()));

  const totals = useMemo(() => {
    const earned = workers.reduce((s, w) => s + earnedOf(w), 0);
    const paid = workers.reduce((s, w) => s + paidOf(w.id), 0);
    const adv = workers.reduce((s, w) => s + advanceOf(w.id), 0);
    const pending = workers.reduce((s, w) => s + pendingOf(w), 0);
    const live = payments.filter((p) => p.status === 'paid');
    const cash = live.filter((p) => methodMeta(p.method).online === false).reduce((s, p) => s + p.amount, 0);
    const online = live.filter((p) => methodMeta(p.method).online).reduce((s, p) => s + p.amount, 0);
    const viaRep = live.filter((p) => p.representative).reduce((s, p) => s + p.amount, 0);
    const adj = workers.reduce((s, w) => s + adjOf(w.id), 0);
    return { earned, paid, adv, pending, cash, online, viaRep, adj };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workers, payments, adjustments, attendance, overtime, advances]);

  const worker = (id: string) => workers.find((w) => w.id === id);
  const wName = (id: string) => worker(id)?.name ?? '—';

  const tabLabel = (key: TabKey, fallback: string) => t(`wage.tab_${key}`, fallback);

  return (
    <PageShell title={t('wage.wageRegister', 'Wage Register')} showBack>
      {/* tabs */}
      <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 16px 11px', position: 'sticky', top: 0, zIndex: 10, background: 'var(--anrix-surface)', borderBottom: '1px solid var(--anrix-border)' }}>
        {TABS.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)} style={pill(tab === tb.key)}>
            <IonIcon icon={tb.icon} style={{ verticalAlign: '-2px', marginRight: 4 }} />{tabLabel(tb.key, tb.label)}
          </button>
        ))}
      </div>

      <SyncStatusPill />
      <AnimatedPage>
        {/* ---------------- LEDGERS ---------------- */}
        {tab === 'ledgers' && (
          <div style={{ padding: '12px 16px 24px' }}>
            <div style={{ padding: 12, borderRadius: 'var(--anrix-radius-xl)', background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', border: '1px solid var(--anrix-hero-border)', boxShadow: 'var(--anrix-hero-shadow)', marginBottom: 12 }}>
              <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 13 }}>{t('wage.outstandingToWorkers', 'Outstanding to workers')}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--anrix-hero-accent)' }}>{rupee(totals.pending)}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12.5, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--anrix-hero-muted)' }}>{t('wage.earned', 'Earned')} {rupee(totals.earned)}</span>
                <span style={{ color: 'var(--anrix-hero-muted)' }}>{t('wage.paid', 'Paid')} {rupee(totals.paid)}</span>
                <span style={{ color: 'var(--anrix-warning)' }}>{t('wage.advance', 'Advance')} {rupee(totals.adv)}</span>
              </div>
            </div>

            <button onClick={() => setRepOpen(true)} style={{ width: '100%', marginBottom: 12, height: 44, borderRadius: 12, border: '1.5px solid var(--anrix-primary)', background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IonIcon icon={peopleOutline} /> {t('wage.payGroupViaRepresentative', 'Pay group via representative')}
            </button>

            <div style={{ position: 'relative', marginBottom: 10 }}>
              <IonIcon icon={searchOutline} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--anrix-text-muted)', fontSize: 18 }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('wage.searchNWorkers', 'Search {{n}} workers…', { n: workers.length })} style={inp(40)} />
            </div>

            {wList.map((w) => {
              const pending = pendingOf(w);
              const settled = pending <= 0 && paidOf(w.id) > 0;
              return (
                <div key={w.id} className="anrix-card" style={{ marginBottom: 6, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div onClick={() => setLedgerWorker(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                    <Avatar name={w.name} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{w.name}</div>
                      <div className="anrix-muted" style={{ fontSize: 11 }}>{t('wage.earned', 'Earned')} {rupee(earnedOf(w))} · {t('wage.paid', 'Paid')} {rupee(paidOf(w.id))}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: pending > 0 ? 'var(--anrix-warning)' : 'var(--anrix-success)', fontSize: 14.5 }}>{rupee(pending)}</strong>
                      <div className="anrix-muted" style={{ fontSize: 10 }}>{t('wage.pending', 'pending')}</div>
                    </div>
                  </div>
                  {settled
                    ? <Badge tone="success">{t('wage.settled', 'Settled')}</Badge>
                    : <button onClick={() => setPayWorker(w.id)} style={payBtn}>{t('wage.pay', 'Pay')}</button>}
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------- PAYMENTS HISTORY ---------------- */}
        {tab === 'payments' && (
          <div style={{ padding: '12px 16px 24px' }}>
            {payments.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--anrix-text-muted)' }}>{t('wage.noPaymentsRecorded', 'No payments recorded yet.')}</div>}
            {payments.map((p) => (
              <div key={p.id} className="anrix-card" style={{ marginBottom: 8, padding: 12, opacity: p.status === 'void' ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{methodMeta(p.method).emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{wName(p.workerId)} {p.isPartial && <Badge tone="warning">{t('wage.partial', 'Partial')}</Badge>}</div>
                    <div className="anrix-muted" style={{ fontSize: 11.5 }}>{methodMeta(p.method).label} · {p.createdAt} · {p.receiptNo}</div>
                  </div>
                  <strong style={{ fontSize: 15 }}>{rupee(p.amount)}</strong>
                </div>
                {p.representative && (
                  <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--anrix-primary-soft)', fontSize: 12, color: 'var(--anrix-primary-strong)', fontWeight: 600 }}>
                    ↳ {t('wage.routedToRepresentative', 'Routed to representative')} <strong>{p.representative.repName}</strong>{p.representative.reason ? ` · ${p.representative.reason}` : ''}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 11.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {p.txnNumber && <span className="anrix-muted">{t('wage.txn', 'Txn')} {p.txnNumber}</span>}
                  {p.utr && <span className="anrix-muted">{t('wage.utr', 'UTR')} {p.utr}</span>}
                  {p.paidBy && <span className="anrix-muted">{t('wage.by', 'By')} {p.paidBy}</span>}
                  {p.status === 'void' && <Badge tone="danger">{t('wage.void', 'Void')}</Badge>}
                  <button onClick={() => setReceipt(p)} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--anrix-surface-2)', border: 'none', borderRadius: 8, padding: '6px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: 'var(--anrix-primary-strong)' }}>
                    <IonIcon icon={receiptOutline} /> {t('wage.receipt', 'Receipt')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---------------- REPORTS ---------------- */}
        {tab === 'reports' && (
          <div style={{ padding: '12px 16px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <Register label={t('wage.cashRegister', 'Cash register')} emoji="💵" amount={totals.cash} />
              <Register label={t('wage.onlineRegister', 'Online register')} emoji="📲" amount={totals.online} />
              <Register label={t('wage.representativePayments', 'Representative payments')} emoji="👥" amount={totals.viaRep} />
              <Register label={t('wage.advanceRegister', 'Advance register')} emoji="🟠" amount={totals.adv} />
              <Register label={t('wage.totalPaid', 'Total paid')} emoji="✅" amount={totals.paid} />
              <Register label={t('wage.outstanding', 'Outstanding')} emoji="⏳" amount={totals.pending} />
            </div>
            <div className="anrix-card" style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('wage.paymentRegisterByMethod', 'Payment register · by method')}</div>
              {PAY_METHODS.map((m) => {
                const sum = payments.filter((p) => p.status === 'paid' && p.method === m.key).reduce((s, p) => s + p.amount, 0);
                if (!sum) return null;
                return <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13.5 }}><span>{m.emoji} {m.label}</span><strong>{rupee(sum)}</strong></div>;
              })}
              {payments.filter((p) => p.status === 'paid').length === 0 && <div className="anrix-muted" style={{ fontSize: 13 }}>{t('wage.noPaymentsYet', 'No payments yet.')}</div>}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <GradientButton variant="outline" full icon={downloadOutline} onClick={() => setToast(t('wage.exportReadyToast', 'Export ready (PDF/Excel hook up at backend)'))} style={{ flex: 1 }}>{t('wage.export', 'Export')}</GradientButton>
              <GradientButton full icon={printOutline} onClick={() => window.print()} style={{ flex: 1 }}>{t('wage.print', 'Print')}</GradientButton>
            </div>
          </div>
        )}

        {/* ---------------- AUDIT ---------------- */}
        {tab === 'audit' && (
          <div style={{ padding: '12px 16px 24px' }}>
            {audit.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--anrix-text-muted)' }}>{t('wage.noActivityYet', 'No activity yet.')}</div>}
            {audit.map((a) => (
              <div key={a.id} className="anrix-card" style={{ marginBottom: 6, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <IonIcon icon={shieldCheckmarkOutline} style={{ color: 'var(--anrix-primary-strong)', fontSize: 18 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.action} · {a.detail}</div>
                  <div className="anrix-muted" style={{ fontSize: 11 }}>{a.user} ({a.role}) · {a.at}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatedPage>

      {/* ---- single payment modal ---- */}
      {payWorker && (() => {
        const w = worker(payWorker)!;
        return (
          <PaymentModal worker={{ id: w.id, name: w.name, dayRate: w.dayRate }} pending={pendingOf(w)} me={me}
            onClose={() => setPayWorker(null)}
            onDone={(rows) => {
              const created = recordPayments(rows.map((r) => ({ ...r, projectId: activeProjectId, workerId: w.id })), me);
              setPayWorker(null); setReceipt(created[0]); setToast(`Recorded ${rupee(created[0].amount)} · ${created[0].receiptNo}`);
            }} />
        );
      })()}

      {/* ---- representative modal ---- */}
      {repOpen && (
        <RepresentativeModal workers={workers.map((w) => ({ id: w.id, name: w.name, pending: pendingOf(w) }))}
          onClose={() => setRepOpen(false)}
          onDone={(rep, picks, method, txn) => {
            const rows = picks.map((pk) => ({
              projectId: activeProjectId, workerId: pk.workerId, amount: pk.amount, method,
              txnNumber: txn || undefined,
              representative: { repName: rep.name, repMobile: rep.mobile || undefined, reason: rep.reason || undefined, linkedWorkerIds: picks.map((x) => x.workerId) },
              paidBy: me.user,
            }));
            const created = recordPayments(rows, me);
            setRepOpen(false);
            setToast(`Paid ${rupee(created.reduce((s, p) => s + p.amount, 0))} for ${created.length} workers via ${rep.name}`);
          }} />
      )}

      {/* ---- worker ledger ---- */}
      <IonModal isOpen={!!ledgerWorker} onDidDismiss={() => setLedgerWorker(null)} initialBreakpoint={0.92} breakpoints={[0, 0.92, 1]}>
        {ledgerWorker && (() => {
          const w = worker(ledgerWorker)!;
          const wPayments = paidForWorker(payments, w.id);
          const wAdvances = advances.filter((a) => a.workerId === w.id);
          const wAdj = adjustmentsForWorker(adjustments, w.id);
          return (
            <div style={{ padding: 18, maxHeight: '90vh', overflowY: 'auto' }}>
              <ModalHead onClose={() => setLedgerWorker(null)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={w.name} src={w.photo} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{w.name}</div>
                  <div className="anrix-muted">{w.trade} · ₹{w.dayRate}/day{w.skill ? ` · ${w.skill}` : ''}</div>
                </div>
                <button onClick={() => setMasterWorker(w.id)} style={{ ...payBtn, background: 'var(--anrix-surface-2)', color: 'var(--anrix-primary-strong)' }}>{t('wage.profile', 'Profile')}</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                <LedgerCell label={t('wage.totalEarned', 'Total earned')} value={rupee(earnedOf(w))} />
                <LedgerCell label={t('wage.totalPaid', 'Total paid')} value={rupee(paidOf(w.id))} tone="success" />
                <LedgerCell label={adjOf(w.id) < 0 ? t('wage.penaltyDeduction', 'Penalty / deduction') : t('wage.bonusIncentive', 'Bonus / incentive')} value={`${adjOf(w.id) < 0 ? '−' : '+'}${rupee(Math.abs(adjOf(w.id)))}`} tone={adjOf(w.id) < 0 ? 'warning' : 'success'} />
                <LedgerCell label={t('wage.advances', 'Advances')} value={rupee(advanceOf(w.id))} tone="warning" />
                <LedgerCell label={t('wage.pendingBalance', 'Pending balance')} value={rupee(pendingOf(w))} tone="primary" />
              </div>

              <button onClick={() => setAdjFor(w.id)} style={{ width: '100%', marginTop: 12, height: 42, borderRadius: 11, border: '1.5px dashed var(--anrix-border)', background: 'transparent', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
                🎁 {t('wage.addBonusIncentivePenalty', 'Add bonus / incentive / penalty')}
              </button>

              {wAdj.length > 0 && <>
                <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>{t('wage.bonusIncentivePenalty', 'Bonus / incentive / penalty')}</div>
                {wAdj.map((a) => { const m = ADJUSTMENT_META[a.kind]; return (
                  <div key={a.id} className="anrix-card" style={{ marginBottom: 6, padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{m.emoji}</span>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.label}{a.reason ? ` · ${a.reason}` : ''}</div><div className="anrix-muted" style={{ fontSize: 11 }}>{a.createdAt}</div></div>
                    <strong style={{ color: m.sign < 0 ? 'var(--anrix-warning)' : 'var(--anrix-success)' }}>{m.sign < 0 ? '−' : '+'}{rupee(a.amount)}</strong>
                    <button onClick={() => voidAdjustment(a.id, me)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--anrix-text-muted)', fontSize: 18 }}><IonIcon icon={closeOutline} /></button>
                  </div>
                ); })}
              </>}

              <div style={{ fontWeight: 700, margin: '18px 0 8px' }}>{t('wage.paymentTimeline', 'Payment timeline')}</div>
              {wPayments.length === 0 && <div className="anrix-muted" style={{ fontSize: 13 }}>{t('wage.noPaymentsYet', 'No payments yet.')}</div>}
              {wPayments.map((p) => (
                <div key={p.id} className="anrix-card" style={{ marginBottom: 6, padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{methodMeta(p.method).emoji}</span>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13.5 }}>{methodMeta(p.method).label}{p.representative ? ` · via ${p.representative.repName}` : ''}</div><div className="anrix-muted" style={{ fontSize: 11 }}>{p.createdAt} · {p.receiptNo}</div></div>
                  <strong>{rupee(p.amount)}</strong>
                  <button onClick={() => { setLedgerWorker(null); setReceipt(p); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><IonIcon icon={receiptOutline} style={{ color: 'var(--anrix-primary-strong)', fontSize: 18 }} /></button>
                </div>
              ))}
              {wAdvances.length > 0 && <>
                <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>{t('wage.advances', 'Advances')}</div>
                {wAdvances.map((a) => (
                  <div key={a.id} className="anrix-card" style={{ marginBottom: 6, padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <IonIcon icon={walletOutline} style={{ color: 'var(--anrix-warning)', fontSize: 18 }} />
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.note || t('wage.advanceLabel', 'Advance')}</div><div className="anrix-muted" style={{ fontSize: 11 }}>{a.date}</div></div>
                    <strong style={{ color: 'var(--anrix-warning)' }}>−{rupee(a.amount)}</strong>
                  </div>
                ))}
              </>}
              <div style={{ marginTop: 16 }}><GradientButton icon={cashOutline} onClick={() => { setLedgerWorker(null); setPayWorker(w.id); }}>{t('wage.pay', 'Pay')} {rupee(pendingOf(w))}</GradientButton></div>
            </div>
          );
        })()}
      </IonModal>

      {/* ---- add bonus / incentive / penalty ---- */}
      <IonModal isOpen={!!adjFor} onDidDismiss={() => setAdjFor(null)} initialBreakpoint={0.7} breakpoints={[0, 0.7, 1]}>
        {adjFor && <AdjustmentModal workerName={wName(adjFor)} onClose={() => setAdjFor(null)}
          onDone={(kind, amount, reason) => { addAdjustment({ projectId: activeProjectId, workerId: adjFor, kind, amount, reason }, me); setAdjFor(null); setToast(`${ADJUSTMENT_META[kind].label} recorded`); }} />}
      </IonModal>

      {/* ---- worker master ---- */}
      <IonModal isOpen={!!masterWorker} onDidDismiss={() => setMasterWorker(null)} initialBreakpoint={0.95} breakpoints={[0, 0.95, 1]}>
        {masterWorker && worker(masterWorker) && <WorkerMasterModal worker={worker(masterWorker)!} onClose={() => setMasterWorker(null)}
          onSave={(patch) => { updateWorker(masterWorker, patch); setMasterWorker(null); setToast(t('wage.workerProfileSaved', 'Worker profile saved')); }} />}
      </IonModal>

      {/* ---- receipt ---- */}
      <IonModal isOpen={!!receipt} onDidDismiss={() => setReceipt(null)} initialBreakpoint={0.85} breakpoints={[0, 0.85, 1]}>
        {receipt && <ReceiptView p={receipt} workerName={wName(receipt.workerId)} onClose={() => setReceipt(null)} onShare={() => setToast(t('wage.shareHookToast', 'Share hook (WhatsApp/Email) at backend'))} />}
      </IonModal>

      <IonToast isOpen={!!toast} message={toast} duration={1600} onDidDismiss={() => setToast('')} />
    </PageShell>
  );
}

/* ---------------- Payment modal ---------------- */
function PaymentModal({ worker, pending, me, onClose, onDone }: {
  worker: { id: string; name: string; dayRate: number }; pending: number; me: { user: string; role: string };
  onClose: () => void; onDone: (rows: ModalRow[]) => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(String(pending || ''));
  const [method, setMethod] = useState<PayMethod>('phonepe');
  const [txn, setTxn] = useState(''); const [upi, setUpi] = useState('');
  const [cashLeg, setCashLeg] = useState(''); const [onlineLeg, setOnlineLeg] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<string | undefined>();

  const m = methodMeta(method);
  const amt = method === 'mixed' ? (Number(cashLeg) || 0) + (Number(onlineLeg) || 0) : Number(amount) || 0;
  const partial = amt > 0 && amt < pending;

  const submit = () => {
    if (amt <= 0) return;
    onDone([{
      amount: amt, method, txnNumber: txn || undefined, upiId: upi || undefined,
      legs: method === 'mixed' ? [{ method: 'cash', amount: Number(cashLeg) || 0 }, { method: 'upi', amount: Number(onlineLeg) || 0 }] : undefined,
      isPartial: partial, paidBy: me.user, approvedBy: approvedBy || undefined, note: note || undefined, receipt,
    }]);
  };

  return (
    <IonModal isOpen onDidDismiss={onClose} initialBreakpoint={0.95} breakpoints={[0, 0.95, 1]}>
      <div style={{ padding: 18, maxHeight: '92vh', overflowY: 'auto' }}>
        <ModalHead onClose={onClose} />
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>{t('wage.pay', 'Pay')} {worker.name}</h2>
        <div className="anrix-muted" style={{ marginBottom: 14, fontSize: 13.5 }}>{t('wage.pendingCap', 'Pending')} {rupee(pending)} · {t('wage.enterLessForPartial', 'enter less for a partial payment')}</div>

        <Label>{t('wage.amountRupee', 'Amount ₹')}</Label>
        {method !== 'mixed'
          ? <input value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} style={inp()} />
          : <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}><Label>{t('wage.cash', 'Cash')}</Label><input value={cashLeg} inputMode="numeric" onChange={(e) => setCashLeg(e.target.value.replace(/\D/g, ''))} style={inp()} /></div>
              <div style={{ flex: 1 }}><Label>{t('wage.online', 'Online')}</Label><input value={onlineLeg} inputMode="numeric" onChange={(e) => setOnlineLeg(e.target.value.replace(/\D/g, ''))} style={inp()} /></div>
            </div>}
        {partial && <div style={{ color: 'var(--anrix-warning)', fontSize: 12.5, marginTop: 6 }}>{t('wage.partialLabel', 'Partial')} — {rupee(pending - amt)} {t('wage.willRemainPending', 'will remain pending.')}</div>}

        <Label style={{ marginTop: 16 }}>{t('wage.payWith', 'Pay with')}</Label>
        <div style={{ display: 'flex', gap: 8 }}>
          {UPI_OPTIONS.map((mm) => (
            <button key={mm.key} onClick={() => setMethod(mm.key)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', borderRadius: 14, cursor: 'pointer',
                border: method === mm.key ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
                background: method === mm.key ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)' }}>
              <PayLogo method={mm.key} size={30} />
              <span style={{ fontSize: 12, fontWeight: 700, color: method === mm.key ? 'var(--anrix-primary)' : 'var(--anrix-text)' }}>{mm.label}</span>
            </button>
          ))}
        </div>

        {/* method-specific fields */}
        <Field label={t('wage.upiId', 'UPI ID')} value={upi} onChange={setUpi} placeholder={t('wage.nameAtBank', 'name@bank')} />
        <Field label={t('wage.transactionRefNo', 'Transaction / Ref no.')} value={txn} onChange={setTxn} />

        {/* receipt screenshot */}
        <Label style={{ marginTop: 14 }}>{t('wage.receiptScreenshot', 'Receipt / screenshot')}</Label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, border: '1.5px dashed var(--anrix-border)', cursor: 'pointer', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 13.5 }}>
          <IonIcon icon={cloudUploadOutline} /> {receipt ? t('wage.changePhoto', 'Change photo') : t('wage.attachPhoto', 'Attach photo')}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setReceipt(r.result as string); r.readAsDataURL(f);
          }} />
        </label>
        {receipt && <img src={receipt} alt="receipt" style={{ display: 'block', marginTop: 10, maxHeight: 120, borderRadius: 10, border: '1px solid var(--anrix-border)' }} />}

        <Field label={t('wage.approvedByOptional', 'Approved by (optional)')} value={approvedBy} onChange={setApprovedBy} />
        <Field label={t('wage.noteOptional', 'Note (optional)')} value={note} onChange={setNote} />

        <div style={{ marginTop: 16 }}>
          <GradientButton disabled={amt <= 0} icon={checkmarkCircle} onClick={submit}>{t('wage.record', 'Record')} {rupee(amt)} · {m.label}</GradientButton>
        </div>
      </div>
    </IonModal>
  );
}

/* ---------------- Representative modal (CASE 2) ---------------- */
function RepresentativeModal({ workers, onClose, onDone }: {
  workers: { id: string; name: string; pending: number }[];
  onClose: () => void;
  onDone: (rep: { name: string; mobile: string; reason: string }, picks: { workerId: string; amount: number }[], method: PayMethod, txn: string) => void;
}) {
  const { t } = useTranslation();
  const [repName, setRepName] = useState(''); const [repMobile, setRepMobile] = useState(''); const [reason, setReason] = useState('No bank / phone');
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [method, setMethod] = useState<PayMethod>('phonepe');
  const [txn, setTxn] = useState('');
  const picks = workers.filter((w) => picked[w.id] && w.pending > 0).map((w) => ({ workerId: w.id, amount: w.pending }));
  const total = picks.reduce((s, p) => s + p.amount, 0);

  return (
    <IonModal isOpen onDidDismiss={onClose} initialBreakpoint={0.95} breakpoints={[0, 0.95, 1]}>
      <div style={{ padding: 18, maxHeight: '92vh', overflowY: 'auto' }}>
        <ModalHead onClose={onClose} />
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>{t('wage.payViaRepresentative', 'Pay via representative')}</h2>
        <div className="anrix-muted" style={{ marginBottom: 14, fontSize: 13.5 }}>{t('wage.routeSeveralWages', "Route several workers' wages to one person who has a phone / bank account.")}</div>

        <Field label={t('wage.representativeName', 'Representative name')} value={repName} onChange={setRepName} placeholder={t('wage.egWorkerD', 'e.g. Worker D')} />
        <Field label={t('wage.representativeMobile', 'Representative mobile')} value={repMobile} onChange={setRepMobile} placeholder={t('wage.phonePlaceholder', '+91…')} />
        <Field label={t('wage.reason', 'Reason')} value={reason} onChange={setReason} />

        <Label style={{ marginTop: 8 }}>{t('wage.workersWhoseWagesRouted', 'Workers whose wages are routed')}</Label>
        {workers.filter((w) => w.pending > 0).map((w) => (
          <label key={w.id} className="anrix-card" style={{ marginBottom: 6, padding: 10, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!picked[w.id]} onChange={(e) => setPicked((p) => ({ ...p, [w.id]: e.target.checked }))} style={{ width: 18, height: 18, accentColor: 'var(--anrix-primary)' }} />
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{w.name}</span>
            <strong>{rupee(w.pending)}</strong>
          </label>
        ))}

        <Label style={{ marginTop: 12 }}>{t('wage.payRepresentativeWith', 'Pay representative with')}</Label>
        <div style={{ display: 'flex', gap: 8 }}>
          {UPI_OPTIONS.map((mm) => (
            <button key={mm.key} onClick={() => setMethod(mm.key)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', borderRadius: 14, cursor: 'pointer',
                border: method === mm.key ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
                background: method === mm.key ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)' }}>
              <PayLogo method={mm.key} size={30} />
              <span style={{ fontSize: 12, fontWeight: 700, color: method === mm.key ? 'var(--anrix-primary)' : 'var(--anrix-text)' }}>{mm.label}</span>
            </button>
          ))}
        </div>
        <Field label={t('wage.transactionUtrNo', 'Transaction / UTR no.')} value={txn} onChange={setTxn} />

        <div style={{ marginTop: 8, padding: 14, borderRadius: 12, background: 'var(--anrix-surface-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="anrix-muted">{t('wage.totalTo', 'Total to')} {repName || t('wage.representative', 'representative')}</span><strong>{rupee(total)}</strong></div>
          <div className="anrix-muted" style={{ fontSize: 12, marginTop: 2 }}>{picks.length} {t('wage.workersEachOwnLedger', 'workers · each keeps their own ledger entry')}</div>
        </div>
        <div style={{ marginTop: 14 }}>
          <GradientButton disabled={!repName || picks.length === 0} icon={checkmarkCircle} onClick={() => onDone({ name: repName, mobile: repMobile, reason }, picks, method, txn)}>
            {t('wage.pay', 'Pay')} {rupee(total)} {t('wage.to', 'to')} {repName || t('wage.representative', 'representative')}
          </GradientButton>
        </div>
      </div>
    </IonModal>
  );
}

/* ---------------- Adjustment modal ---------------- */
const ADJ_KINDS: { key: AdjustmentKind; label: string; emoji: string }[] = [
  { key: 'bonus', label: 'Bonus', emoji: '🎁' },
  { key: 'incentive', label: 'Incentive', emoji: '⭐' },
  { key: 'penalty', label: 'Penalty', emoji: '⚠️' },
  { key: 'deduction', label: 'Deduction', emoji: '➖' },
];
function AdjustmentModal({ workerName, onClose, onDone }: { workerName: string; onClose: () => void; onDone: (kind: AdjustmentKind, amount: number, reason: string) => void }) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<AdjustmentKind>('bonus');
  const [amount, setAmount] = useState(''); const [reason, setReason] = useState('');
  const amt = Number(amount) || 0;
  const minus = kind === 'penalty' || kind === 'deduction';
  return (
    <div style={{ padding: 18, maxHeight: '90vh', overflowY: 'auto' }}>
      <ModalHead onClose={onClose} />
      <h2 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 800 }}>{t('wage.adjustWorkerWage', "Adjust {{name}}'s wage", { name: workerName })}</h2>
      <Label>{t('wage.type', 'Type')}</Label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ADJ_KINDS.map((k) => <button key={k.key} onClick={() => setKind(k.key)} style={methodChip(kind === k.key)}>{k.emoji} {t(`wage.adjKind_${k.key}`, k.label)}</button>)}
      </div>
      <Field label={t('wage.amountRupee', 'Amount ₹')} value={amount} onChange={(v) => setAmount(v.replace(/\D/g, ''))} />
      <Field label={t('wage.reason', 'Reason')} value={reason} onChange={setReason} placeholder={minus ? t('wage.egLateDamage', 'e.g. late, damage') : t('wage.egFestivalGoodWork', 'e.g. festival, good work')} />
      <div style={{ marginTop: 16 }}>
        <GradientButton disabled={amt <= 0} icon={checkmarkCircle} onClick={() => onDone(kind, amt, reason)}>
          {minus ? t('wage.deduct', 'Deduct') : t('wage.add', 'Add')} {rupee(amt)}
        </GradientButton>
      </div>
    </div>
  );
}

/* ---------------- Worker Master ---------------- */
function WorkerMasterModal({ worker, onClose, onSave }: { worker: ManagedWorker; onClose: () => void; onSave: (patch: Partial<ManagedWorker>) => void }) {
  const { t } = useTranslation();
  const [f, setF] = useState<Partial<ManagedWorker>>({ ...worker });
  const set = (k: keyof ManagedWorker) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const SKILLS: ManagedWorker['skill'][] = ['unskilled', 'semi-skilled', 'skilled', 'highly-skilled'];
  return (
    <div style={{ padding: 18, maxHeight: '92vh', overflowY: 'auto' }}>
      <ModalHead onClose={onClose} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
        <Avatar name={worker.name} src={f.photo} size={64} />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: '1.5px dashed var(--anrix-border)', cursor: 'pointer', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 13 }}>
          <IonIcon icon={cloudUploadOutline} /> {f.photo ? t('wage.changePhoto', 'Change photo') : t('wage.addPhoto', 'Add photo')}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const r = new FileReader(); r.onload = () => setF((p) => ({ ...p, photo: r.result as string })); r.readAsDataURL(file); }} />
        </label>
      </div>

      <SectionLabel>{t('wage.basic', 'Basic')}</SectionLabel>
      <Field label={t('wage.name', 'Name')} value={f.name ?? ''} onChange={set('name')} />
      <Field label={t('wage.tradeWork', 'Trade / work')} value={f.trade ?? ''} onChange={set('trade')} />
      <Field label={t('wage.dayRateRupee', 'Day rate ₹')} value={String(f.dayRate ?? '')} onChange={(v) => setF((p) => ({ ...p, dayRate: Number(v.replace(/\D/g, '')) || 0 }))} />
      <Label style={{ marginTop: 14 }}>{t('wage.skillGrade', 'Skill grade')}</Label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SKILLS.map((s) => <button key={s} onClick={() => setF((p) => ({ ...p, skill: s }))} style={methodChip(f.skill === s)}>{s}</button>)}
      </div>
      <Field label={t('wage.mobile', 'Mobile')} value={f.mobile ?? ''} onChange={set('mobile')} placeholder={t('wage.phonePlaceholder', '+91…')} />
      <Field label={t('wage.dateOfBirth', 'Date of birth')} value={f.dob ?? ''} onChange={set('dob')} placeholder={t('wage.datePlaceholder', 'DD/MM/YYYY')} />
      <Field label={t('wage.joinedOn', 'Joined on')} value={f.joinedOn ?? ''} onChange={set('joinedOn')} placeholder={t('wage.datePlaceholder', 'DD/MM/YYYY')} />
      <div style={{ marginTop: 14 }}>
        <Label>{t('wage.address', 'Address')}</Label>
        <LocationField value={f.address ?? ''} onChange={set('address')} placeholder={t('wage.homeAddressArea', 'Home address / area')} inputStyle={inp()} />
      </div>

      <SectionLabel>{t('wage.identityRecordKeeping', 'Identity (record-keeping)')}</SectionLabel>
      <Field label={t('wage.aadhaarNo', 'Aadhaar no.')} value={f.aadhaar ?? ''} onChange={set('aadhaar')} />
      <Field label={t('wage.pan', 'PAN')} value={f.pan ?? ''} onChange={set('pan')} />

      <SectionLabel>{t('wage.bankPayout', 'Bank / payout')}</SectionLabel>
      <Field label={t('wage.bankName', 'Bank name')} value={f.bankName ?? ''} onChange={set('bankName')} />
      <Field label={t('wage.accountNo', 'Account no.')} value={f.accountNo ?? ''} onChange={set('accountNo')} />
      <Field label={t('wage.ifsc', 'IFSC')} value={f.ifsc ?? ''} onChange={set('ifsc')} />
      <Field label={t('wage.upiId', 'UPI ID')} value={f.upiId ?? ''} onChange={set('upiId')} placeholder={t('wage.nameAtBank', 'name@bank')} />

      <SectionLabel>{t('wage.emergencyContact', 'Emergency contact')}</SectionLabel>
      <Field label={t('wage.name', 'Name')} value={f.emergencyName ?? ''} onChange={set('emergencyName')} />
      <Field label={t('wage.phone', 'Phone')} value={f.emergencyPhone ?? ''} onChange={set('emergencyPhone')} />

      <div style={{ marginTop: 18 }}><GradientButton icon={checkmarkCircle} onClick={() => onSave(f)}>{t('wage.saveProfile', 'Save profile')}</GradientButton></div>
    </div>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 800, fontSize: 14, margin: '12px 0 2px', color: 'var(--anrix-text-strong)' }}>{children}</div>;
}

/* ---------------- Receipt ---------------- */
function ReceiptView({ p, workerName, onClose, onShare }: { p: Payment; workerName: string; onClose: () => void; onShare: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ padding: 18 }}>
      <ModalHead onClose={onClose} />
      <div style={{ border: '1px solid var(--anrix-border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', borderBottom: '1px solid var(--anrix-hero-border)', padding: 16, textAlign: 'center' }}>
          <div style={{ fontWeight: 900, letterSpacing: '0.18em', fontSize: 18 }}>NIRMANAM</div>
          <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 11 }}>{t('wage.paymentReceipt', 'Payment Receipt')} · {p.receiptNo}</div>
        </div>
        <div style={{ padding: 16 }}>
          <RcRow k={t('wage.worker', 'Worker')} v={workerName} />
          <RcRow k={t('wage.dateTime', 'Date & time')} v={p.createdAt} />
          <RcRow k={t('wage.method', 'Method')} v={methodMeta(p.method).label} />
          {p.txnNumber && <RcRow k={t('wage.transaction', 'Transaction')} v={p.txnNumber} />}
          {p.utr && <RcRow k={t('wage.utr', 'UTR')} v={p.utr} />}
          {p.representative && <RcRow k={t('wage.representativeCap', 'Representative')} v={p.representative.repName} />}
          {p.paidBy && <RcRow k={t('wage.paidBy', 'Paid by')} v={p.paidBy} />}
          {p.approvedBy && <RcRow k={t('wage.approvedBy', 'Approved by')} v={p.approvedBy} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--anrix-border)' }}>
            <span style={{ fontWeight: 700 }}>{t('wage.amountPaid', 'Amount paid')}</span>
            <strong style={{ fontSize: 22, color: 'var(--anrix-success)' }}>{rupee(p.amount)}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <div style={{ width: 60, height: 60, borderRadius: 8, background: 'repeating-conic-gradient(#16181d 0% 25%, #fff 0% 50%) 50% / 12px 12px' }} aria-hidden />
            <div className="anrix-muted" style={{ fontSize: 11 }}>{t('wage.scanToVerify', 'Scan to verify')} · {p.receiptNo}<br />{t('wage.digitalRecordSupports', 'Digital record — supports accounting & audit.')}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <GradientButton variant="outline" full icon={printOutline} onClick={() => window.print()} style={{ flex: 1 }}>{t('wage.printPdf', 'Print / PDF')}</GradientButton>
        <GradientButton full icon={receiptOutline} onClick={onShare} style={{ flex: 1 }}>{t('wage.share', 'Share')}</GradientButton>
      </div>
    </div>
  );
}

/* ---------------- small bits ---------------- */
function ModalHead({ onClose }: { onClose: () => void }) {
  return <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
    <button onClick={onClose} style={{ background: 'var(--anrix-surface-2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><IonIcon icon={closeOutline} style={{ fontSize: 20 }} /></button>
  </div>;
}
function Register({ label, emoji, amount }: { label: string; emoji: string; amount: number }) {
  return <div className="anrix-card" style={{ padding: 14 }}><div style={{ fontSize: 22 }}>{emoji}</div><div style={{ fontWeight: 800, fontSize: 18, marginTop: 2 }}>{rupee(amount)}</div><div className="anrix-muted" style={{ fontSize: 11.5 }}>{label}</div></div>;
}
function LedgerCell({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'warning' | 'primary' }) {
  const c = tone === 'success' ? 'var(--anrix-success)' : tone === 'warning' ? 'var(--anrix-warning)' : tone === 'primary' ? 'var(--anrix-primary)' : 'var(--anrix-text-strong)';
  return <div className="anrix-card" style={{ padding: 12 }}><div className="anrix-muted" style={{ fontSize: 11.5 }}>{label}</div><div style={{ fontWeight: 800, fontSize: 18, color: c }}>{value}</div></div>;
}
function RcRow({ k, v }: { k: string; v: string }) { return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13.5 }}><span className="anrix-muted">{k}</span><strong>{v}</strong></div>; }
function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--anrix-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', ...style }}>{children}</div>;
}
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div style={{ marginTop: 14 }}><Label>{label}</Label><input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inp()} /></div>;
}
const inp = (padL = 14): React.CSSProperties => ({ width: '100%', height: 48, borderRadius: 12, border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)', padding: `0 14px 0 ${padL}px`, fontSize: 15, color: 'var(--anrix-text-strong)', outline: 'none' });
const pill = (a: boolean): React.CSSProperties => ({ whiteSpace: 'nowrap', padding: '8px 14px', borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: a ? '1.5px solid transparent' : '1.5px solid var(--anrix-border)', background: a ? 'var(--anrix-primary)' : 'var(--anrix-surface)', color: a ? 'var(--anrix-on-primary)' : 'var(--anrix-text)' });
const methodChip = (a: boolean): React.CSSProperties => ({ padding: '8px 12px', borderRadius: 10, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', border: a ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)', background: a ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)', color: a ? 'var(--anrix-primary)' : 'var(--anrix-text)' });
const payBtn: React.CSSProperties = { background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', border: 'none', borderRadius: 9, padding: '8px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' };
