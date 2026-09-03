import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IonIcon, IonSpinner, useIonToast } from '@ionic/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationOutline, timeOutline, arrowForward, bookmark, bookmarkOutline, checkmarkCircle } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Pressable } from '@components/motion';
import { Segmented } from '@components/data/Segmented';
import { Badge } from '@design/primitives';
import { jobsApi } from '@services/api/jobsApi';

export function JobsFeedPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'nearby' | 'applied' | 'saved'>('nearby');
  const qc = useQueryClient();
  const [toast] = useIonToast();

  const nearby = useQuery({ queryKey: ['jobs', 'nearby'], queryFn: () => jobsApi.list(), enabled: tab === 'nearby' });
  const applied = useQuery({ queryKey: ['jobs', 'applied'], queryFn: () => jobsApi.applied(), enabled: tab === 'applied' });
  const saved = useQuery({ queryKey: ['jobs', 'saved'], queryFn: () => jobsApi.saved(), enabled: tab === 'saved' });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['jobs'] });

  const apply = useMutation({
    mutationFn: (jobId: number) => jobsApi.apply(jobId),
    onSuccess: () => { void toast({ message: t('jobs.appliedToast', 'Applied ✓'), duration: 1400, color: 'success', position: 'top' }); invalidate(); },
    onError: (e: any) => toast({ message: e.message || t('jobs.couldNotApply', 'Could not apply'), duration: 1800, color: 'danger', position: 'top' }),
  });
  const toggleSave = useMutation({
    mutationFn: (jobId: number) => jobsApi.toggleSave(jobId),
    onSuccess: () => invalidate(),
  });

  const jobs = nearby.data ?? [];

  return (
    <PageShell title={t('jobs.jobs', 'Jobs')}>
      <AnimatedPage>
        <Segmented value={tab} onChange={setTab}
          options={[{ key: 'nearby', label: t('jobs.nearby', 'Nearby') }, { key: 'applied', label: t('jobs.applied', 'Applied') }, { key: 'saved', label: t('jobs.saved', 'Saved') }]} />

        {tab === 'nearby' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px 12px', color: 'var(--anrix-text-muted)', fontSize: 13 }}>
              <IonIcon icon={locationOutline} /> {t('jobs.openJobs', 'Open jobs')} · <strong style={{ color: 'var(--anrix-success)' }}>{jobs.length}</strong>
            </div>
            {nearby.isLoading && <Center><IonSpinner /></Center>}
            {nearby.isSuccess && jobs.length === 0 && <Empty text={t('jobs.noOpenJobs', 'No open jobs right now.')} />}
            {jobs.map((j: any) => (
              <Pressable key={j.job_id}>
                <div className="anrix-card" style={{ margin: '0 16px 10px', padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{j.ttl_tx}</span>
                    <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--anrix-success)', whiteSpace: 'nowrap' }}>₹{Number(j.pay_am)}<span className="anrix-muted" style={{ fontWeight: 400, fontSize: 11 }}>/{j.pay_unit_cd}</span></span>
                  </div>
                  <div className="anrix-muted" style={{ fontSize: 12.5, marginTop: 1 }}>{j.employer_nm}{j.rtng_nm ? ` · ★${Number(j.rtng_nm).toFixed(1)}` : ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 12.5, color: 'var(--anrix-text-muted)' }}>
                    {j.lctn_tx && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}><IonIcon icon={locationOutline} /> {j.lctn_tx}</span>}
                    {j.days_cnt && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}><IonIcon icon={timeOutline} /> {t('jobs.days', '{{count}} days', { count: j.days_cnt })}</span>}
                    {j.urgnt_in === 1 && <Badge tone="danger">{t('jobs.urgent', 'Urgent')}</Badge>}
                    <button onClick={() => toggleSave.mutate(j.job_id)} aria-label={t('jobs.save', 'Save')}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: j.saved ? 'var(--anrix-primary)' : 'var(--anrix-text-muted)' }}>
                      <IonIcon icon={j.saved ? bookmark : bookmarkOutline} style={{ fontSize: 18 }} />
                    </button>
                  </div>
                  <button disabled={j.applied || apply.isPending} onClick={() => apply.mutate(j.job_id)}
                    style={{ marginTop: 10, width: '100%', height: 42, borderRadius: 12, border: 'none', cursor: j.applied ? 'default' : 'pointer',
                      background: j.applied ? 'var(--anrix-surface-2)' : 'var(--anrix-primary)', color: j.applied ? 'var(--anrix-success)' : 'var(--anrix-on-primary)', fontWeight: 700, fontSize: 14,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {j.applied ? <><IonIcon icon={checkmarkCircle} /> {t('jobs.applied', 'Applied')}</> : <>{t('jobs.apply', 'Apply')} <IonIcon icon={arrowForward} /></>}
                  </button>
                </div>
              </Pressable>
            ))}
          </>
        )}

        {tab === 'applied' && (
          <>
            {applied.isLoading && <Center><IonSpinner /></Center>}
            {applied.isSuccess && (applied.data ?? []).length === 0 && <Empty text={t('jobs.noApplications', 'No applications yet — apply to a nearby job.')} />}
            {(applied.data ?? []).map((j: any) => (
              <div key={j.job_id} className="anrix-card" style={{ margin: '0 16px 10px', padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{j.ttl_tx}</span>
                  <Badge tone={j.aplctn_sts === 'hired' ? 'success' : j.aplctn_sts === 'rejected' ? 'danger' : 'info'}>{j.aplctn_sts}</Badge>
                </div>
                <div className="anrix-muted" style={{ fontSize: 12.5, marginTop: 2 }}>₹{Number(j.pay_am)}/{j.pay_unit_cd}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'saved' && (
          <>
            {saved.isLoading && <Center><IonSpinner /></Center>}
            {saved.isSuccess && (saved.data ?? []).length === 0 && <Empty text={t('jobs.noSavedJobs', 'No saved jobs yet.')} />}
            {(saved.data ?? []).map((j: any) => (
              <div key={j.job_id} className="anrix-card" style={{ margin: '0 16px 10px', padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{j.ttl_tx}</span>
                  <span style={{ fontWeight: 800, color: 'var(--anrix-success)' }}>₹{Number(j.pay_am)}/{j.pay_unit_cd}</span>
                </div>
                {j.lctn_tx && <div className="anrix-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{j.lctn_tx}</div>}
              </div>
            ))}
          </>
        )}
      </AnimatedPage>
    </PageShell>
  );
}

const Center = ({ children }: { children: React.ReactNode }) => <div style={{ display: 'grid', placeItems: 'center', padding: 48 }}>{children}</div>;
const Empty = ({ text }: { text: string }) => <div style={{ textAlign: 'center', padding: 48, color: 'var(--anrix-text-muted)' }}>{text}</div>;
