import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { IonIcon, IonModal, IonToast, IonSpinner } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addOutline, locationOutline, navigateOutline, closeOutline, chevronForward } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { getCurrentLocation, reverseGeocode } from '@services/location/geolocation';
import { workforceApi } from '@services/api/workforceApi';
import { PROJECT_STATUS_META, projectStatusOf } from '@features/workforce/status';
import { Badge } from '@design/primitives';

/**
 * Project picker — the entry to Workforce. Projects are the SAME backend "sites" shown on
 * the Sites & Teams page (one shared list). Tapping a project opens its workspace, scoped
 * to that project's real id, so the board always shows the right project.
 */
export function WorkforceProjectsPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const qc = useQueryClient();
  const [newProj, setNewProj] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLoc, setNewLoc] = useState('');
  const [gettingGps, setGettingGps] = useState(false);
  const [toast, setToast] = useState('');

  const { data: projects = [], isLoading } = useQuery({ queryKey: ['workforce', 'projects'], queryFn: () => workforceApi.projects() });

  const open = (id: number | string) => history.push(`/app/workforce/board/${id}`);

  const create = useMutation({
    mutationFn: (body: { name: string; locationLabel?: string }) => workforceApi.createProject(body),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['workforce', 'projects'] });
      setNewProj(false);
      const id = res?.prjct_id ?? res?.data?.prjct_id;
      if (id) open(id);
    },
    onError: (e: any) => setToast(e?.message || 'Could not create project'),
  });

  const openNew = () => { setNewName(''); setNewLoc(''); setNewProj(true); };
  const createProject = () => { if (newName.trim()) create.mutate({ name: newName.trim(), locationLabel: newLoc.trim() || undefined }); };

  const useMyLocation = async () => {
    setGettingGps(true);
    try {
      const p = await getCurrentLocation();
      setNewLoc(await reverseGeocode(p));
      setToast('Location captured 📍');
    } catch { setToast('Could not get location — check permission'); }
    setGettingGps(false);
  };

  return (
    <PageShell title={t('wf.projects', 'Projects')}>
      <AnimatedPage>
        {isLoading && <BrandLoader />}

        <div style={{ background: 'var(--anrix-surface)', borderBottom: '1px solid var(--anrix-border)' }}>
          {!isLoading && projects.length === 0 && (
            <div style={{ textAlign: 'center', padding: 36, color: 'var(--anrix-text-muted)', fontSize: 14 }}>
              {t('wf.noProjectsYet', 'No projects yet. Tap')} <strong>{t('wf.newProject', 'New Project')}</strong> {t('wf.toStart', 'to start.')}
            </div>
          )}

          {(projects as any[]).map((p) => (
            <div key={p.prjct_id} className="anrix-pressable" style={{ borderBottom: '1px solid var(--anrix-border)' }}>
              <div onClick={() => open(p.prjct_id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: 22, background: 'var(--anrix-primary-soft)', flexShrink: 0 }}>🏗️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 15.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nm_tx}</span>
                    <span style={{ flexShrink: 0 }}><Badge tone={PROJECT_STATUS_META[projectStatusOf(p)].tone}>{PROJECT_STATUS_META[projectStatusOf(p)].label}</Badge></span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--anrix-text-muted)', display: 'flex', gap: 8, marginTop: 2, alignItems: 'center' }}>
                    {p.lctn_lbl && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><IonIcon icon={locationOutline} style={{ fontSize: 13 }} /> {p.lctn_lbl}</span>}
                    <span>{p.worker_count ?? 0} {t('wf.workersLower', 'workers')}</span>
                  </div>
                </div>
                <IonIcon icon={chevronForward} style={{ color: 'var(--anrix-text-muted)', flexShrink: 0 }} />
              </div>
            </div>
          ))}
        </div>
      </AnimatedPage>

      {/* Floating New Project button — bottom right, above the tab bar */}
      <button onClick={openNew} aria-label="New Project"
        style={{
          position: 'fixed', right: 16, bottom: 'calc(86px + env(safe-area-inset-bottom))', zIndex: 50,
          display: 'inline-flex', alignItems: 'center', gap: 8, height: 52, padding: '0 20px 0 16px',
          borderRadius: 999, border: 'none', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)',
          fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 22px rgba(22, 24, 29,0.42)',
        }}>
        <IonIcon icon={addOutline} style={{ fontSize: 24 }} /> {t('wf.newProject', 'New Project')}
      </button>

      {/* New project — name + optional location (creates a backend site) */}
      <IonModal isOpen={newProj} onDidDismiss={() => setNewProj(false)} initialBreakpoint={0.62} breakpoints={[0, 0.62]} handle>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t('wf.newProjectLower', 'New project')}</h2>
            <button onClick={() => setNewProj(false)} style={{ background: 'var(--anrix-surface-2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
            </button>
          </div>
          <div className="anrix-muted" style={{ fontSize: 12.5, marginBottom: 16 }}>{t('wf.eachProjectTracks', 'Each project tracks its own team, attendance, payroll & bills separately.')}</div>

          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--anrix-text-muted)', margin: '0 0 7px', letterSpacing: 0.2 }}>{t('wf.projectSiteName', 'Project / site name')}</label>
          <input value={newName} autoFocus onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') createProject(); }} placeholder={t('wf.egVasaviApartments', 'e.g. Vasavi Apartments')}
            style={{ width: '100%', height: 48, padding: '0 14px', borderRadius: 12, border: '1.5px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', color: 'var(--anrix-text-strong)', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />

          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--anrix-text-muted)', margin: '16px 0 7px', letterSpacing: 0.2 }}>{t('wf.location', 'Location')}</label>
          <input value={newLoc} onChange={(e) => setNewLoc(e.target.value)} placeholder={t('wf.areaLandmarkAddress', 'Area, landmark or address')}
            style={{ width: '100%', height: 48, padding: '0 14px', borderRadius: 12, border: '1.5px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', color: 'var(--anrix-text-strong)', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
          <button onClick={useMyLocation} disabled={gettingGps} className="anrix-pressable"
            style={{ marginTop: 10, width: '100%', height: 46, borderRadius: 'var(--anrix-radius-md)', border: '1.5px dashed var(--anrix-border-strong)', background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 14, cursor: gettingGps ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {gettingGps ? <><IonSpinner name="crescent" style={{ width: 18, height: 18 }} /> {t('wf.gettingLocation', 'Getting location…')}</> : <><IonIcon icon={navigateOutline} style={{ fontSize: 18 }} /> {t('wf.useMyCurrentLocation', 'Use my current location')}</>}
          </button>

          <button onClick={createProject} disabled={!newName.trim() || create.isPending} className="anrix-pressable"
            style={{ marginTop: 20, width: '100%', height: 50, borderRadius: 'var(--anrix-radius-md)', border: 'none', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 800, fontSize: 15.5, cursor: 'pointer', opacity: newName.trim() ? 1 : 0.5 }}>
            {create.isPending ? <IonSpinner name="crescent" style={{ width: 20, height: 20 }} /> : t('wf.createProject', 'Create project')}
          </button>
        </div>
      </IonModal>

      <IonToast isOpen={!!toast} message={toast} duration={1600} onDidDismiss={() => setToast('')} />
    </PageShell>
  );
}
