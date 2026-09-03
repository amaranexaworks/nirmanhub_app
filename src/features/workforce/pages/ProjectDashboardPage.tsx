import { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon,
} from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import {
  peopleOutline, cashOutline, shieldCheckmarkOutline, warningOutline, documentTextOutline,
  receiptOutline, businessOutline, chevronForward, alertCircle, sparklesOutline,
} from 'ionicons/icons';
import { workforceApi } from '@services/api/workforceApi';
import { useTranslation } from 'react-i18next';

/**
 * Project dashboard — the PM/CEO scorecard and reports hub. KPI tiles (headcount,
 * present-today, month wage bill, verified-punch trust, open incidents), a "needs
 * attention" inbox (flagged punches, over-claim bills, serious incidents — the pragmatic
 * approvals surface), and quick links into every register/report.
 */

type Kpis = { workers: number; presentToday: number; monthWage: number; verifiedPunches: number; flaggedPunches: number; trustPct: number | null; openIncidents: number; budget: number | null };
type Alert = { kind: string; severity: string; count: number; message: string; go: string };

const inr = (v: number | null | undefined) => `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const SEV_TONE: Record<string, string> = { high: '#ea580c', critical: 'var(--anrix-danger, #dc2626)', medium: '#d97706' };

export function ProjectDashboardPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    workforceApi.kpis(id)
      .then((r) => { if (alive) { setKpis(r?.kpis || null); setAlerts(r?.alerts || []); } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const go = (sub: string) => history.push(`/app/workforce/board/${id}/${sub}`);

  const tiles = kpis ? [
    { icon: peopleOutline, label: t('wf.presentToday', 'Present today'), value: `${kpis.presentToday}/${kpis.workers}`, color: '#2563eb' },
    { icon: cashOutline, label: t('wf.wageBillMonth', 'Wage bill (month)'), value: inr(kpis.monthWage), color: '#16a34a' },
    { icon: shieldCheckmarkOutline, label: t('wf.punchTrust', 'Punch trust'), value: kpis.trustPct != null ? `${kpis.trustPct}%` : '—', color: 'var(--anrix-primary-strong, #9a6a06)' },
    { icon: warningOutline, label: t('wf.openIncidents', 'Open incidents'), value: String(kpis.openIncidents), color: kpis.openIncidents ? 'var(--anrix-danger, #dc2626)' : '#6b7280' },
  ] : [];

  const links = [
    { icon: documentTextOutline, label: t('wf.musterRoll', 'Muster Roll'), sub: t('wf.musterRollSub', 'Monthly register · export'), go: 'muster' },
    { icon: receiptOutline, label: t('wf.contractorBilling', 'Contractor Billing'), sub: t('wf.contractorBillingSub', 'Reconcile vs muster'), go: 'contractors' },
    { icon: businessOutline, label: t('wf.pfEsiBocw', 'PF / ESI / BOCW'), sub: t('wf.pfEsiBocwSub', 'Statutory run'), go: 'compliance' },
    { icon: cashOutline, label: t('wf.progressCost', 'Progress & Cost'), sub: t('wf.progressCostSub', 'DPR · budget vs actual'), go: 'progress' },
    { icon: shieldCheckmarkOutline, label: t('wf.safety', 'Safety'), sub: t('wf.safetySub', 'Incidents · PPE'), go: 'safety' },
    { icon: sparklesOutline, label: t('wf.aiInsights', 'AI Insights'), sub: t('wf.aiInsightsSub', 'Fraud · forecast · audit'), go: 'ai-insights' },
  ];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={`/app/workforce/board/${id}`} /></IonButtons>
          <IonTitle>{t('wf.dashboard', 'Dashboard')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading ? (
          <BrandLoader />
        ) : (
          <div style={{ padding: 14 }}>
            {/* KPI tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {tiles.map((t) => (
                <div key={t.label} className="anrix-card" style={{ padding: 14 }}>
                  <IonIcon icon={t.icon} style={{ fontSize: 22, color: t.color }} />
                  <div style={{ fontWeight: 800, fontSize: 22, marginTop: 4 }}>{t.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>{t.label}</div>
                </div>
              ))}
            </div>

            {/* Needs attention inbox */}
            {alerts.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', margin: '18px 2px 8px' }}>{t('wf.needsAttention', 'Needs attention')}</div>
                {alerts.map((a, i) => (
                  <button key={i} onClick={() => go(a.go)} style={{
                    width: '100%', textAlign: 'left', marginBottom: 8, padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'rgba(220,38,38,0.06)', border: `1px solid ${SEV_TONE[a.severity] || '#dc2626'}55`,
                  }}>
                    <IonIcon icon={alertCircle} style={{ fontSize: 22, color: SEV_TONE[a.severity] || 'var(--anrix-danger, #dc2626)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{a.message}</span>
                    <IonIcon icon={chevronForward} style={{ color: 'var(--anrix-text-muted)' }} />
                  </button>
                ))}
              </>
            )}

            {/* Reports hub */}
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', margin: '18px 2px 8px' }}>{t('wf.registersReports', 'Registers & reports')}</div>
            <div className="anrix-card" style={{ padding: '2px 14px' }}>
              {links.map((l, i) => (
                <button key={l.go} onClick={() => go(l.go)} style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', cursor: 'pointer',
                  background: 'none', border: 'none', borderTop: i ? '1px solid var(--anrix-border)' : 'none',
                }}>
                  <IonIcon icon={l.icon} style={{ fontSize: 20, color: 'var(--anrix-primary-strong, #9a6a06)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{l.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>{l.sub}</div>
                  </div>
                  <IonIcon icon={chevronForward} style={{ color: 'var(--anrix-text-muted)' }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
