import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery } from '@tanstack/react-query';
import { bookmarkOutline, locationOutline, arrowForward } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Pressable } from '@components/motion';
import { jobsApi } from '@services/api/jobsApi';

/** Saved jobs the user bookmarked. */
export function SavedPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ['jobs', 'saved'], queryFn: () => jobsApi.saved() });

  return (
    <PageShell title={t('saved.title', 'Saved & Searches')} showBack>
      <AnimatedPage>
        {isLoading && <BrandLoader />}

        {!isLoading && jobs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 56, color: 'var(--anrix-text-muted)' }}>
            <IonIcon icon={bookmarkOutline} style={{ fontSize: 40, opacity: 0.4 }} />
            <p style={{ marginTop: 10 }}>{t('saved.nothingSaved', 'Nothing saved yet.')}</p>
            <button onClick={() => history.push('/app/jobs')} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--anrix-primary-strong)', fontWeight: 700, cursor: 'pointer' }}>
              {t('saved.browseJobs', 'Browse jobs →')}
            </button>
          </div>
        )}

        {jobs.map((j: any) => (
          <Pressable key={j.job_id}>
            <div className="anrix-card" style={{ margin: '0 16px 10px', padding: 12 }} onClick={() => history.push('/app/jobs')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{j.ttl_tx}</span>
                <span style={{ fontWeight: 800, color: 'var(--anrix-success)', whiteSpace: 'nowrap' }}>₹{Number(j.pay_am)}<span className="anrix-muted" style={{ fontWeight: 400, fontSize: 11 }}>/{j.pay_unit_cd}</span></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12.5, color: 'var(--anrix-text-muted)' }}>
                {j.lctn_tx && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}><IonIcon icon={locationOutline} /> {j.lctn_tx}</span>}
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--anrix-primary-strong)', fontWeight: 700 }}>{t('saved.view', 'View')} <IonIcon icon={arrowForward} /></span>
              </div>
            </div>
          </Pressable>
        ))}
      </AnimatedPage>
    </PageShell>
  );
}
