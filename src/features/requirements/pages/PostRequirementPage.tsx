import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonToast } from '@ionic/react';
import { useQueryClient } from '@tanstack/react-query';
import { megaphoneOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { Thumb } from '@components/media/Thumb';
import { LocationField } from '@components/form/LocationField';
import { GradientButton } from '@design/primitives';
import { requirementsApi } from '@services/api/requirementsApi';
import { SERVICES, serviceMeta, type ServiceType } from '../store/requirementsStore';

export function PostRequirementPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const qc = useQueryClient();

  const [type, setType] = useState<ServiceType>('build_house');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [area, setArea] = useState('');
  const [floors, setFloors] = useState('');
  const [desc, setDesc] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const meta = serviceMeta(type);

  const post = async () => {
    if (!title || !location) { setToast(t('req.addTitleAndLocation', 'Add a title and location')); return; }
    setBusy(true);
    try {
      await requirementsApi.create({
        serviceType: type, title, location,
        budget: budget || undefined,
        areaSqft: meta.construction && area ? Number(area) : undefined,
        floors: meta.construction && floors ? Number(floors) : undefined,
        description: desc || undefined,
      });
      qc.invalidateQueries({ queryKey: ['requirements'] });
      setToast(t('req.postedToast', 'Posted! Matching pros will send quotes — compare them here.'));
      setTimeout(() => history.replace('/app/my-posts'), 900);
    } catch (e: any) {
      setToast(e.message || t('req.couldNotPost', 'Could not post requirement'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title={t('req.postRequirement', 'Post a Requirement')} showBack footer={<GradientButton icon={megaphoneOutline} disabled={busy} onClick={() => void post()}>{busy ? t('req.posting', 'Posting…') : t('req.postRequirementBtn', 'Post requirement')}</GradientButton>}>
      <AnimatedPage>
        <div style={{ padding: 16 }}>
          <p className="anrix-muted" style={{ margin: '0 0 12px', fontSize: 14 }}>{t('req.tellUsWhatYouNeed', 'Tell us what you need — the right pros will see it and reach out.')}</p>

          <Label>{t('req.whatDoYouNeed', 'What do you need?')}</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {SERVICES.map((s) => {
              const on = type === s.type;
              return (
                <button key={s.type} onClick={() => setType(s.type)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 13, cursor: 'pointer', textAlign: 'left',
                  border: on ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
                  background: on ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)',
                }}>
                  <Thumb img={s.image} emoji={s.emoji} size={38} radius={11} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: on ? 'var(--anrix-primary)' : 'var(--anrix-text-strong)' }}>{s.label}</span>
                </button>
              );
            })}
          </div>

          <Field label={t('req.title', 'Title')} value={title} onChange={setTitle} placeholder={meta.construction ? t('req.titlePlaceholderConstruction', 'e.g. Build G+2 house on 30×40 plot') : t('req.titlePlaceholderService', 'e.g. {{label}} for 2BHK', { label: meta.label })} />

          {meta.construction && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}><Field label={t('req.plotArea', 'Plot / built area (sqft)')} value={area} onChange={(v) => setArea(v.replace(/\D/g, ''))} placeholder="1200" numeric /></div>
              <div style={{ flex: 1 }}><Field label={t('req.floorsLabel', 'Floors')} value={floors} onChange={(v) => setFloors(v.replace(/\D/g, ''))} placeholder="3" numeric /></div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <Label>{t('req.location', 'Location')}</Label>
            <LocationField value={location} onChange={setLocation} placeholder={t('req.locationPlaceholder', 'Area, city')} inputStyle={input} />
          </div>
          <Field label={t('req.budgetOptional', 'Budget (optional)')} value={budget} onChange={setBudget} placeholder={t('req.budgetPlaceholder', 'e.g. ₹35–45 L')} />
          <Field label={t('req.detailsOptional', 'Details (optional)')} value={desc} onChange={setDesc} placeholder={t('req.detailsPlaceholder', 'Any specifics — timeline, requirements…')} textarea />
        </div>
      </AnimatedPage>
      <IonToast isOpen={!!toast} message={toast} duration={1300} onDidDismiss={() => setToast('')} />
    </PageShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>;
}
function Field({ label, value, onChange, placeholder, numeric, textarea }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; numeric?: boolean; textarea?: boolean }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Label>{label}</Label>
      {textarea ? (
        <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...input, height: 'auto', paddingTop: 12, resize: 'vertical' }} />
      ) : (
        <input value={value} inputMode={numeric ? 'numeric' : 'text'} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={input} />
      )}
    </div>
  );
}
const input: React.CSSProperties = { width: '100%', height: 50, borderRadius: 12, border: '1.5px solid var(--anrix-border)', background: 'var(--anrix-surface)', padding: '0 14px', fontSize: 15, color: 'var(--anrix-text-strong)', outline: 'none' };
