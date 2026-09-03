import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon,
} from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { sparklesOutline, warningOutline, peopleOutline, ribbonOutline, cashOutline, copyOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { workforceApi } from '@services/api/workforceApi';

/**
 * AI Insights — grounded analytics over the project's real data. Not a chatbot: it's the
 * fraud/forecast/audit engine the muster + billing data makes possible. Attendance-fraud
 * ranking, duplicate-identity detection, labour forecast, contractor trust rating, and a
 * payroll audit that flags missing KYC / advances over earnings before payout.
 */

type Insights = {
  fraud: {
    flaggedWorkers: { workr_id: number; emp_cd: string; nm_tx: string; flagged_cnt: number; flagged_pct: number | null }[];
    duplicates: { identity: string; match_on: string; names: string[]; codes: string[]; cnt: number }[];
  };
  forecast: { avgPresent: number; peakPresent: number; daysSampled: number; suggestedManpower: number };
  contractors: { contractorId: number; name: string; bills: number; avgOverclaimPct: number; disputes: number; rating: number }[];
  payrollAudit: { workr_id: number; nm_tx: string; emp_cd: string; earned_am: string | number; advance_am: string | number; missing_payment: boolean; missing_kyc: boolean; advance_over_earning: boolean }[];
};

const ratingTone = (r: number) => (r >= 75 ? 'var(--anrix-success, #16a34a)' : r >= 45 ? '#d97706' : 'var(--anrix-danger, #dc2626)');

export function AiInsightsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    workforceApi.aiInsights(id)
      .then((r) => { if (alive) setD(r as Insights); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={`/app/workforce/board/${id}/dashboard`} /></IonButtons>
          <IonTitle>{t('wf.aiInsights', 'AI Insights')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading ? (
          <BrandLoader />
        ) : !d ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--anrix-text-muted)' }}>{t('wf.noInsightsAvailable', 'No insights available.')}</div>
        ) : (
          <div style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: 'var(--anrix-text-muted)', fontSize: 13 }}>
              <IonIcon icon={sparklesOutline} style={{ fontSize: 18, color: 'var(--anrix-primary-strong, #9a6a06)' }} />
              {t('wf.computedFromVerifiedData', "Computed from this project's verified attendance, billing & payroll.")}
            </div>

            {/* Labour forecast */}
            <Section icon={peopleOutline} title={t('wf.labourForecast', 'Labour forecast')}>
              <div style={{ display: 'flex', gap: 16 }}>
                <Big value={String(d.forecast.suggestedManpower)} label={t('wf.suggestedManpowerPerDay', 'Suggested manpower/day')} />
                <Big value={String(d.forecast.peakPresent)} label={t('wf.recentPeak', 'Recent peak')} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--anrix-text-muted)', margin: '8px 0 0' }}>
                {t('wf.forecastBasis', 'Based on {{days}} recent working days (avg {{avg}} present).', { days: d.forecast.daysSampled, avg: d.forecast.avgPresent })}
              </p>
            </Section>

            {/* Attendance fraud */}
            <Section icon={warningOutline} title={t('wf.attendanceFraudRisk', 'Attendance fraud risk')} tone="var(--anrix-danger, #dc2626)">
              {!d.fraud.flaggedWorkers.length && !d.fraud.duplicates.length ? (
                <Empty>{t('wf.noFraudSignals', 'No fraud signals this month. 👍')}</Empty>
              ) : (
                <>
                  {d.fraud.flaggedWorkers.map((w) => (
                    <Line key={w.workr_id} main={w.nm_tx} sub={w.emp_cd}
                      right={`${w.flagged_pct != null ? `${w.flagged_pct}%` : ''} · ${w.flagged_cnt} flagged`} rightTone="var(--anrix-danger, #dc2626)" />
                  ))}
                  {d.fraud.duplicates.map((dup, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '9px 0', borderTop: '1px solid var(--anrix-border)' }}>
                      <IonIcon icon={copyOutline} style={{ color: 'var(--anrix-danger, #dc2626)', fontSize: 18 }} />
                      <div style={{ flex: 1, fontSize: 13 }}>
                        <b>{t('wf.duplicate', 'Duplicate')} {dup.match_on}</b> — {dup.names.join(', ')}
                        <div style={{ fontSize: 11, color: 'var(--anrix-text-muted)' }}>{dup.codes.join(' · ')}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </Section>

            {/* Contractor rating */}
            <Section icon={ribbonOutline} title={t('wf.contractorTrustRating', 'Contractor trust rating')}>
              {!d.contractors.length ? <Empty>{t('wf.noContractorsBilled', 'No contractors billed yet.')}</Empty> : d.contractors.map((c) => (
                <div key={c.contractorId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--anrix-border)' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', background: ratingTone(c.rating), flexShrink: 0 }}>{c.rating}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>{c.bills} bills · avg over-claim {c.avgOverclaimPct}% · {c.disputes} disputed</div>
                  </div>
                </div>
              ))}
            </Section>

            {/* Payroll audit */}
            <Section icon={cashOutline} title={t('wf.payrollAudit', 'Payroll audit')}>
              {!d.payrollAudit.length ? <Empty>{t('wf.noPayrollAnomalies', 'No payroll anomalies. ✓')}</Empty> : d.payrollAudit.map((p) => (
                <div key={p.workr_id} style={{ padding: '9px 0', borderTop: '1px solid var(--anrix-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{p.nm_tx}</span>
                    <span style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>{p.emp_cd}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                    {p.advance_over_earning && <Tag tone="var(--anrix-danger, #dc2626)">{t('wf.advanceOverEarnings', 'Advance > earnings')}</Tag>}
                    {p.missing_payment && <Tag tone="#d97706">{t('wf.noBankUpi', 'No bank/UPI')}</Tag>}
                    {p.missing_kyc && <Tag tone="#d97706">{t('wf.noAadhaar', 'No Aadhaar')}</Tag>}
                  </div>
                </div>
              ))}
            </Section>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}

function Section({ icon, title, tone, children }: { icon: string; title: string; tone?: string; children: React.ReactNode }) {
  return (
    <div className="anrix-card" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <IonIcon icon={icon} style={{ fontSize: 20, color: tone || 'var(--anrix-primary-strong, #9a6a06)' }} />
        <span style={{ fontWeight: 800, fontSize: 15 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
const Big = ({ value, label }: { value: string; label: string }) => (
  <div><div style={{ fontWeight: 800, fontSize: 26 }}>{value}</div><div style={{ fontSize: 11.5, color: 'var(--anrix-text-muted)' }}>{label}</div></div>
);
const Line = ({ main, sub, right, rightTone }: { main: string; sub: string; right: string; rightTone?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: '1px solid var(--anrix-border)' }}>
    <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{main}</div><div style={{ fontSize: 11, color: 'var(--anrix-text-muted)' }}>{sub}</div></div>
    <span style={{ fontWeight: 800, fontSize: 13, color: rightTone }}>{right}</span>
  </div>
);
const Empty = ({ children }: { children: React.ReactNode }) => <div style={{ fontSize: 13, color: 'var(--anrix-text-muted)' }}>{children}</div>;
const Tag = ({ tone, children }: { tone: string; children: React.ReactNode }) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, color: tone, background: `${tone}18` }}>{children}</span>
);
