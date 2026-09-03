import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon,
} from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { shieldCheckmark, ribbonOutline, businessOutline, calendarOutline, checkmarkCircle } from 'ionicons/icons';
import { workforceApi } from '@services/api/workforceApi';

/**
 * Digital Worker Passport — the portable, cross-employer record. Aggregates everything
 * the person has done on Nirmanam (every project, every builder, tenure), their
 * attendance reliability, and the verified-punch TRUST score that no paper certificate
 * or rival app can produce. This is what a new employer scans before hiring.
 */

type Passport = {
  profile: { workerId: number; name: string; trade: string | null; skill: string | null; photo: string | null; code: string | null; mobile: string | null };
  stats: { projects: number; builders: number; firstJoined: string | null; presentDays: number; reliabilityPct: number | null; verifiedPunches: number; trustPct: number | null };
  certs: { cert_id: number; nm_tx: string; issuer_tx: string | null; issued_dt: string | null; expiry_dt: string | null; vrfy_in: number }[];
};

const SKILL_LABEL: Record<string, string> = {
  unskilled: 'Unskilled', 'semi-skilled': 'Semi-skilled', skilled: 'Skilled', 'highly-skilled': 'Highly skilled',
};

export function WorkerPassportPage() {
  const { t } = useTranslation();
  const { workerId } = useParams<{ workerId: string }>();
  const [p, setP] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    workforceApi.workerPassport(workerId)
      .then((r) => { if (alive) setP(r as Passport); })
      .catch(() => { if (alive) setP(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [workerId]);

  const tenure = (d: string | null) => {
    if (!d) return '—';
    const days = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 86400000));
    if (days < 60) return `${days} days`;
    const months = Math.round(days / 30);
    return months < 24 ? `${months} months` : `${Math.round(months / 12)} years`;
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/app/workforce" /></IonButtons>
          <IonTitle>{t('wf.workerPassport', 'Worker Passport')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading ? (
          <BrandLoader />
        ) : !p ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--anrix-text-muted)' }}>{t('wf.passportNotFound', 'Passport not found.')}</div>
        ) : (
          <div style={{ padding: 14 }}>
            {/* Identity header */}
            <div className="anrix-card" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: '#e7d3a6', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                {p.profile.photo ? <img src={p.profile.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 30 }}>👷</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 19 }}>{p.profile.name}</div>
                <div style={{ fontSize: 13, color: 'var(--anrix-text-muted)' }}>
                  {p.profile.trade || '—'}{p.profile.skill ? ` · ${SKILL_LABEL[p.profile.skill] || p.profile.skill}` : ''}
                </div>
                {p.profile.code && <div style={{ fontSize: 11, color: 'var(--anrix-text-muted)', marginTop: 2 }}>{p.profile.code}</div>}
              </div>
            </div>

            {/* Trust score — the Nirmanam-only signal */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.30)', textAlign: 'center' }}>
                <IonIcon icon={shieldCheckmark} style={{ color: 'var(--anrix-success, #16a34a)', fontSize: 22 }} />
                <div style={{ fontWeight: 800, fontSize: 24 }}>{p.stats.trustPct != null ? `${p.stats.trustPct}%` : '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--anrix-text-muted)' }}>{t('wf.verifiedPunchTrust', 'Verified-punch trust')}</div>
              </div>
              <div style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'var(--anrix-surface-2, #f7f7f5)', border: '1px solid var(--anrix-border)', textAlign: 'center' }}>
                <IonIcon icon={checkmarkCircle} style={{ color: 'var(--anrix-primary-strong, #9a6a06)', fontSize: 22 }} />
                <div style={{ fontWeight: 800, fontSize: 24 }}>{p.stats.reliabilityPct != null ? `${p.stats.reliabilityPct}%` : '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--anrix-text-muted)' }}>{t('wf.attendanceReliability', 'Attendance reliability')}</div>
              </div>
            </div>

            {/* Lifetime stats */}
            <div className="anrix-card" style={{ padding: 16, marginTop: 12 }}>
              <Stat icon={businessOutline} label={t('wf.projectsWorked', 'Projects worked')} value={String(p.stats.projects)} />
              <Stat icon={businessOutline} label={t('wf.employersBuilders', 'Employers / builders')} value={String(p.stats.builders)} />
              <Stat icon={calendarOutline} label={t('wf.onNirmanamSince', 'On Nirmanam since')} value={`${p.stats.firstJoined || '—'} (${tenure(p.stats.firstJoined)})`} />
              <Stat icon={checkmarkCircle} label={t('wf.totalDaysPresent', 'Total days present')} value={String(p.stats.presentDays)} last />
            </div>

            {/* Certifications */}
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', margin: '18px 2px 8px' }}>{t('wf.certifications', 'Certifications')}</div>
            {!p.certs.length ? (
              <div className="anrix-card" style={{ padding: 16, color: 'var(--anrix-text-muted)', fontSize: 13 }}>{t('wf.noCertifications', 'No certifications on record yet.')}</div>
            ) : p.certs.map((c) => (
              <div key={c.cert_id} className="anrix-card" style={{ padding: 14, marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                <IonIcon icon={ribbonOutline} style={{ fontSize: 24, color: 'var(--anrix-primary-strong, #9a6a06)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nm_tx}</div>
                  <div style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>
                    {c.issuer_tx || t('wf.selfDeclared', 'Self-declared')}{c.issued_dt ? ` · ${c.issued_dt}` : ''}
                  </div>
                </div>
                {c.vrfy_in ? <IonIcon icon={shieldCheckmark} style={{ color: 'var(--anrix-success, #16a34a)', fontSize: 20 }} title={t('wf.verified', 'Verified')} /> : null}
              </div>
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}

function Stat({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: last ? 'none' : '1px solid var(--anrix-border)' }}>
      <IonIcon icon={icon} style={{ fontSize: 18, color: 'var(--anrix-text-muted)' }} />
      <span style={{ flex: 1, fontSize: 13.5, color: 'var(--anrix-text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 700, fontSize: 14 }}>{value}</span>
    </div>
  );
}
