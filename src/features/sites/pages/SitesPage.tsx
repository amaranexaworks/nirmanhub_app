import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonIcon, IonSpinner, IonModal, IonActionSheet, useIonToast } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { peopleOutline, imagesOutline, addOutline, arrowForward, businessOutline, locationOutline, navigateOutline, closeOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Pressable } from '@components/motion';
import { Segmented } from '@components/data/Segmented';
import { EmptyState } from '@design/patterns';
import { Badge, GradientButton } from '@design/primitives';
import { workforceApi, type ProjectStatus } from '@services/api/workforceApi';
import { PROJECT_STATUS_META, PROJECT_STATUS_ORDER, projectStatusOf } from '@features/workforce/status';
import { getCurrentLocation, reverseGeocode } from '@services/location/geolocation';

export function SitesPage() {
  const history = useHistory();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [toast] = useIonToast();
  const [tab, setTab] = useState<'sites' | 'teams' | 'attendance'>('sites');

  // New-site sheet
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loc, setLoc] = useState('');
  const [newStatus, setNewStatus] = useState<ProjectStatus>('in_progress');
  const [gettingGps, setGettingGps] = useState(false);
  // Site whose status the user is changing (opens the status action sheet).
  const [statusFor, setStatusFor] = useState<any | null>(null);

  const { data: sites = [], isLoading } = useQuery({ queryKey: ['workforce', 'projects'], queryFn: () => workforceApi.projects() });

  const create = useMutation({
    mutationFn: (body: { name: string; locationLabel?: string; status: ProjectStatus }) => workforceApi.createProject(body),
    onSuccess: () => { void toast({ message: t('sites.siteCreated', 'Site created ✓'), duration: 1400, color: 'success', position: 'top' }); qc.invalidateQueries({ queryKey: ['workforce', 'projects'] }); setOpen(false); },
    onError: (e: any) => toast({ message: e.message || t('sites.couldNotCreate', 'Could not create'), duration: 1800, color: 'danger', position: 'top' }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number | string; status: ProjectStatus }) => workforceApi.setProjectStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workforce', 'projects'] }); },
    onError: (e: any) => toast({ message: e.message || t('sites.couldNotUpdateStatus', 'Could not update status'), duration: 1800, color: 'danger', position: 'top' }),
  });

  const openNew = () => { setName(''); setLoc(''); setNewStatus('in_progress'); setOpen(true); };

  const useMyLocation = async () => {
    setGettingGps(true);
    const p = await getCurrentLocation();
    const label = await reverseGeocode(p);
    setLoc(label);
    setGettingGps(false);
    void toast({ message: t('sites.locationCaptured', 'Location captured 📍'), duration: 1200, color: 'success', position: 'top' });
  };

  const submit = () => { if (name.trim()) create.mutate({ name: name.trim(), locationLabel: loc.trim() || undefined, status: newStatus }); };

  return (
    <PageShell title={t('sites.sitesTeams', 'Sites & Teams')} footer={<GradientButton icon={addOutline} onClick={openNew}>{t('sites.newSite', 'New Site')}</GradientButton>}>
      <AnimatedPage>
        <Segmented value={tab} onChange={setTab}
          options={[{ key: 'sites', label: t('sites.sites', 'Sites') }, { key: 'teams', label: t('sites.teams', 'Teams') }, { key: 'attendance', label: t('sites.attendance', 'Attendance') }]} />

        {tab === 'sites' && (
          <>
            {isLoading && <BrandLoader />}
            {!isLoading && sites.length === 0 && (
              <EmptyState
                icon={businessOutline}
                title={t('sites.addFirstSite', 'Add your first site')}
                message={t('sites.addFirstSiteMsg', 'Create a site to track workers, attendance, and payroll — all in one place.')}
                ctaLabel={t('sites.newSite', 'New Site')}
                onCta={openNew}
                hints={[
                  { icon: peopleOutline, text: t('sites.hintAssignWorkers', 'Assign workers and mark daily attendance') },
                  { icon: imagesOutline, text: t('sites.hintLogProgress', 'Log progress photos as work moves') },
                ]}
              />
            )}
            {sites.map((s: any) => {
              const st = projectStatusOf(s);
              const meta = PROJECT_STATUS_META[st];
              const acc = STATUS_ACCENT[st];
              return (
              <Pressable key={s.prjct_id}>
                <div className="anrix-card" style={{ margin: '0 16px 14px', padding: 0, overflow: 'hidden', position: 'relative' }} onClick={() => history.push(`/app/workforce/board/${s.prjct_id}`)}>
                  {/* status accent stripe */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: acc.fg }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px 12px 18px' }}>
                    <div style={{ flexShrink: 0, width: 50, height: 50, borderRadius: 12, background: acc.bg, display: 'grid', placeItems: 'center' }}>
                      <IonIcon icon={businessOutline} style={{ fontSize: 24, color: acc.fg }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 16, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nm_tx}</span>
                        {/* Tap the status pill to change it (Not started / In progress / Completed) */}
                        <button onClick={(e) => { e.stopPropagation(); setStatusFor(s); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </button>
                      </div>
                      {s.lctn_lbl && <div className="anrix-muted" style={{ fontSize: 12.5, marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}><IonIcon icon={locationOutline} style={{ fontSize: 13, flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.lctn_lbl}</span></div>}
                    </div>
                  </div>
                  {/* stats footer */}
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '10px 14px 12px 18px', borderTop: '1px solid var(--anrix-border)', color: 'var(--anrix-text)', fontSize: 13 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IonIcon icon={peopleOutline} style={{ color: 'var(--anrix-primary-strong)' }} /> {t('sites.workersCount', '{{count}} workers', { count: s.worker_count })}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IonIcon icon={imagesOutline} style={{ color: 'var(--anrix-primary-strong)' }} /> {t('sites.progress', 'Progress')}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--anrix-primary-strong)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{t('sites.manage', 'Manage')} <IonIcon icon={arrowForward} /></span>
                  </div>
                </div>
              </Pressable>
              );
            })}
          </>
        )}

        {tab === 'teams' && (
          <EmptyState
            icon={peopleOutline}
            title={t('sites.buildYourTeam', 'Build your team')}
            message={t('sites.buildYourTeamMsg', "Group supervisors and workers by site so you always know who's where.")}
            ctaLabel={t('sites.openWorkforce', 'Open Workforce')}
            onCta={() => history.push('/app/workforce')}
            hints={[
              { icon: businessOutline, text: t('sites.hintOrganiseWorkers', 'Organise workers under each site') },
              { icon: peopleOutline, text: t('sites.hintSetSupervisor', 'Set a supervisor to run attendance') },
            ]}
          />
        )}

        {tab === 'attendance' && (
          <EmptyState
            icon={peopleOutline}
            title={t('sites.markTodaysAttendance', "Mark today's attendance")}
            message={t('sites.markTodaysAttendanceMsg', 'Take attendance per site, then run payroll from the same numbers — no double entry.')}
            ctaLabel={t('sites.openWorkforce', 'Open Workforce')}
            onCta={() => history.push('/app/workforce')}
            hints={[
              { icon: peopleOutline, text: t('sites.hintMarkPresent', 'One tap to mark present, absent, or half-day') },
              { icon: imagesOutline, text: t('sites.hintAttendanceToWages', 'Attendance flows straight into wages') },
            ]}
          />
        )}
      </AnimatedPage>

      {/* New-site bottom sheet — name + GPS-assisted location */}
      <IonModal isOpen={open} onDidDismiss={() => setOpen(false)} initialBreakpoint={0.62} breakpoints={[0, 0.62]} handle>
        <div style={{ padding: '8px 20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{t('sites.newSiteTitle', 'New site')}</h2>
            <button onClick={() => setOpen(false)} aria-label={t('sites.close', 'Close')} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--anrix-surface-2)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: 18 }} />
            </button>
          </div>

          <label style={fieldLabel}>{t('sites.siteName', 'Site name')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('sites.siteNamePlaceholder', 'e.g. Vasavi Apartments')} autoFocus style={fieldInput} />

          <label style={{ ...fieldLabel, marginTop: 16 }}>{t('sites.location', 'Location')}</label>
          <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder={t('sites.locationPlaceholder', 'Area, landmark or address')} style={fieldInput} />

          <button onClick={useMyLocation} disabled={gettingGps} className="anrix-pressable"
            style={{ marginTop: 10, width: '100%', height: 46, borderRadius: 'var(--anrix-radius-md)', border: '1.5px dashed var(--anrix-border-strong)', background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 14, cursor: gettingGps ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {gettingGps
              ? <><IonSpinner name="crescent" style={{ width: 18, height: 18 }} /> {t('sites.gettingLocation', 'Getting location…')}</>
              : <><IonIcon icon={navigateOutline} style={{ fontSize: 18 }} /> {t('sites.useMyLocation', 'Use my current location')}</>}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--anrix-text-muted)' }}>
            <IonIcon icon={locationOutline} style={{ fontSize: 14 }} /> {t('sites.locationTagHint', 'We only use your location to tag this site on the map.')}
          </div>

          <label style={{ ...fieldLabel, marginTop: 16 }}>{t('sites.status', 'Status')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PROJECT_STATUS_ORDER.map((st) => {
              const on = newStatus === st;
              return (
                <button key={st} type="button" onClick={() => setNewStatus(st)}
                  style={{ flex: 1, height: 42, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    border: on ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border-strong)',
                    background: on ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)',
                    color: on ? 'var(--anrix-primary-strong)' : 'var(--anrix-text-muted)' }}>
                  {PROJECT_STATUS_META[st].label}
                </button>
              );
            })}
          </div>

          <button onClick={submit} disabled={!name.trim() || create.isPending} className="anrix-pressable"
            style={{ marginTop: 20, width: '100%', height: 50, borderRadius: 'var(--anrix-radius-md)', border: 'none', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 800, fontSize: 15.5, cursor: 'pointer', opacity: !name.trim() ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {create.isPending ? <IonSpinner name="crescent" style={{ width: 20, height: 20 }} /> : t('sites.createSite', 'Create site')}
          </button>
        </div>
      </IonModal>

      {/* Change a site's status */}
      <IonActionSheet
        isOpen={!!statusFor}
        header={statusFor ? t('sites.statusFor', 'Status · {{name}}', { name: statusFor.nm_tx }) : t('sites.status', 'Status')}
        onDidDismiss={() => setStatusFor(null)}
        buttons={[
          ...PROJECT_STATUS_ORDER.map((st) => ({
            text: PROJECT_STATUS_META[st].label,
            handler: () => { if (statusFor) setStatus.mutate({ id: statusFor.prjct_id, status: st }); },
          })),
          { text: t('sites.cancel', 'Cancel'), role: 'cancel' as const },
        ]}
      />
    </PageShell>
  );
}

/** Card accent driven by the site's real status — meaningful colour, not decoration.
   in-progress → amber (brand), completed → green, not-started → neutral slate. */
const STATUS_ACCENT: Record<ProjectStatus, { bg: string; fg: string }> = {
  not_started: { bg: 'var(--anrix-tone-slate-bg)', fg: 'var(--anrix-tone-slate-fg)' },
  in_progress: { bg: 'var(--anrix-primary-soft)', fg: 'var(--anrix-primary-strong)' },
  completed: { bg: 'var(--anrix-tone-green-bg)', fg: 'var(--anrix-tone-green-fg)' },
};

const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--anrix-text-muted)', marginBottom: 7, letterSpacing: 0.2 };
const fieldInput: React.CSSProperties = {
  width: '100%', height: 48, padding: '0 14px', borderRadius: 'var(--anrix-radius-md)',
  border: '1.5px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)',
  color: 'var(--anrix-text-strong)', fontSize: 15, outline: 'none', boxSizing: 'border-box',
};
