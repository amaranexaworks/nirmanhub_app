import { IonButton, IonIcon, IonToggle } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { locationOutline, micOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { StatCard, SectionHeader, TileRow, EmptyState } from '@design/patterns';
import { jobsApi } from '@services/api/jobsApi';
import { profileApi } from '@services/api/profileApi';

/** Archetype B dashboard. Layout per docs/05-screens-wireframes.md (Pro/Worker — Home). */
export function WorkerDashboard() {
  const history = useHistory();
  const { t } = useTranslation();
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs', 'nearby'], queryFn: () => jobsApi.list({ limit: 5 }) });
  const { data: applied = [] } = useQuery({ queryKey: ['jobs', 'applied'], queryFn: () => jobsApi.applied() });
  const { data: me } = useQuery({ queryKey: ['users', 'me'], queryFn: () => profileApi.me() });

  const radius = me?.serviceRadiusKm;
  const rate = me?.dayRate;
  const availLabel = [radius ? t('dash.radiusKm', 'Radius {{radius}}km', { radius }) : null, rate ? `₹${rate}/day` : null].filter(Boolean).join(' · ') || t('dash.setYourRateRadius', 'Set your rate & radius');

  return (
    <PageShell title={t('dash.home', 'Home')}>
      {/* Availability strip — stale supply kills the marketplace, so this is front-and-center */}
      <div className="anrix-card anrix-pressable" onClick={() => history.push('/app/availability')} style={{ margin: 'var(--anrix-space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{t('dash.availableToday', 'Available today')}</div>
            <div className="anrix-muted" style={{ fontSize: 13 }}>{availLabel}</div>
          </div>
          <IonToggle checked aria-label="Toggle availability" onClick={(e) => e.stopPropagation()} />
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--anrix-space-4)', padding: '0 var(--anrix-space-5)' }}>
        <StatCard icon="📤" label={t('dash.applied', 'Applied')} value={String(applied.length)} tone="green" hint={applied.length === 1 ? t('dash.job', 'job') : t('dash.jobs', 'jobs')} />
        <StatCard icon="⭐" label={t('dash.rating', 'Rating')} value={me?.rating ? `${me.rating.toFixed(1)}★` : t('dash.new', 'New')} tone="amber" hint={me?.ratingCount ? t('dash.nReviews', '{{count}} reviews', { count: me.ratingCount }) : t('dash.noReviewsYet', 'No reviews yet')} />
      </div>

      <div style={{ padding: '0 var(--anrix-space-5)', marginTop: 'var(--anrix-space-4)' }}>
        <IonButton expand="block" onClick={() => history.push('/app/wallet')}>{t('dash.withdrawEarnings', 'Withdraw earnings')}</IonButton>
      </div>

      {/* Customer requirements matched to your trade */}
      <div className="anrix-card" style={{ margin: 'var(--anrix-space-4) var(--anrix-space-5) 0', paddingTop: 'var(--anrix-space-2)', paddingBottom: 'var(--anrix-space-2)' }}>
        <TileRow
          leading="📣"
          title={t('dash.customerRequirements', 'Customer requirements')}
          subtitle={t('dash.peopleWhoNeedYourTrade', 'People who need your trade — quote & contact')}
          onClick={() => history.push('/app/requirements')}
        />
      </div>

      <SectionHeader title={t('dash.matchesNearYou', 'Matches near you')} action={{ label: t('dash.seeAll', 'See all'), onClick: () => history.push('/app/jobs') }} />
      {jobs.length === 0 && (
        <EmptyState icon={micOutline} title={t('dash.noOpenJobsNearbyYet', 'No open jobs nearby yet')} message={t('dash.newJobsMatchedTrade', 'New jobs matched to your trade will show up here. Check back soon or browse all work.')} ctaLabel={t('dash.browseJobs', 'Browse jobs')} onCta={() => history.push('/app/jobs')} />
      )}
      {jobs.map((j: any) => (
        <div key={j.job_id} className="anrix-card anrix-pressable" onClick={() => history.push('/app/jobs')}
          style={{ margin: '0 var(--anrix-space-5) 10px', padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{j.ttl_tx}</div>
            <div className="anrix-muted" style={{ fontSize: 12.5, margin: '1px 0 3px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {j.employer_nm}{j.rtng_nm ? ` · ★${Number(j.rtng_nm).toFixed(1)}` : ''}{j.lctn_tx ? <><IonIcon icon={locationOutline} /> {j.lctn_tx}</> : null}
            </div>
            <span style={{ color: 'var(--anrix-success)', fontWeight: 800, fontSize: 14 }}>₹{Number(j.pay_am)}/{j.pay_unit_cd}</span>
          </div>
          <IonButton size="small" onClick={(e) => { e.stopPropagation(); history.push('/app/jobs'); }}>{t('dash.viewBid', 'View · Bid')}</IonButton>
        </div>
      ))}

      <div style={{ textAlign: 'center', padding: 'var(--anrix-space-5)' }}>
        <IonButton fill="outline" onClick={() => history.push('/app/jobs')}>
          <IonIcon slot="start" icon={micOutline} />
          {t('dash.findWorkNearMe', 'Find work near me')}
        </IonButton>
      </div>
    </PageShell>
  );
}
