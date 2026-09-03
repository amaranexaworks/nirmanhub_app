import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { IonIcon, IonToast } from '@ionic/react';
import { useQuery } from '@tanstack/react-query';
import { cameraOutline, lockClosed, addOutline, checkmarkCircle } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Reveal } from '@components/motion';
import { Avatar, Badge, GradientButton } from '@design/primitives';
import { LocationField } from '@components/form/LocationField';
import { useAuthStore } from '@stores/authStore';
import { useRoleContext } from '@features/roles/useRoleContext';
import { ROLE_CATALOG } from '@models/roles';
import { profileApi } from '@services/api/profileApi';
import { hiringApi } from '@services/api/hiringApi';

export function EditProfilePage() {
  const { t } = useTranslation();
  const history = useHistory();
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const { archetype, activeRole } = useRoleContext();
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const { data: rates = [] } = useQuery({ queryKey: ['hiring', 'market-rates'], queryFn: () => hiringApi.marketRates() });

  const [form, setForm] = useState({
    name: user?.name ?? '',
    headline: user?.headline ?? '',
    bio: user?.bio ?? '',
    city: user?.city ?? '',
    dayRate: user?.dayRate ?? 0,
    serviceRadiusKm: user?.serviceRadiusKm ?? 5,
    skills: (user?.skills ?? []).join(', '),
  });

  if (!user) return null;
  const isWorker = archetype === 'worker';
  const verified = user.kycTier === 'verified';
  const mr = rates.find((r: any) => r.rle_cd === activeRole);
  const market = mr ? { avg: Math.round(Number(mr.avg_am)), min: Math.round(Number(mr.min_am)), max: Math.round(Number(mr.max_am)), samples: mr.smpls_cnt } : null;

  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    const skillsArr = form.skills ? form.skills.split(',').map((s) => s.trim()).filter(Boolean) : [];
    try {
      await profileApi.update({
        name: form.name, headline: form.headline, bio: form.bio, city: form.city,
        dayRate: Number(form.dayRate) || undefined, serviceRadiusKm: form.serviceRadiusKm,
      });
      for (const sk of skillsArr) await profileApi.addSkill(sk).catch(() => undefined);
      patchUser({
        name: form.name, headline: form.headline, bio: form.bio, city: form.city,
        dayRate: Number(form.dayRate) || undefined, serviceRadiusKm: form.serviceRadiusKm, skills: skillsArr,
      });
      setToast(t('profile.profileUpdated', 'Profile updated'));
      setTimeout(() => history.goBack(), 900);
    } catch (e: any) {
      setToast(e.message || t('profile.couldNotSaveProfile', 'Could not save profile'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title={t('profile.editProfile', 'Edit Profile')} showBack footer={<GradientButton disabled={busy} onClick={() => void save()}>{busy ? t('profile.saving', 'Saving…') : t('profile.saveChanges', 'Save changes')}</GradientButton>}>
      <AnimatedPage>
        {/* Avatar header — framed card with photo, name & active role */}
        <Reveal>
          <div className="anrix-card" style={{ margin: '16px 16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '22px 16px 18px' }}>
            <div style={{ position: 'relative' }}>
              <Avatar name={form.name || 'You'} size={92} verified={verified} />
              <button aria-label={t('profile.changePhoto', 'Change photo')} style={{ position: 'absolute', right: -2, bottom: -2, width: 34, height: 34, borderRadius: '50%', border: '3px solid var(--anrix-surface)', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <IonIcon icon={cameraOutline} />
              </button>
            </div>
            <div style={{ marginTop: 12, fontSize: 17, fontWeight: 800, color: 'var(--anrix-text-strong)', textAlign: 'center' }}>{form.name || t('profile.yourName', 'Your name')}</div>
            {activeRole && <div className="anrix-muted" style={{ fontSize: 13, marginTop: 2 }}>{ROLE_CATALOG[activeRole].emoji} {ROLE_CATALOG[activeRole].label}</div>}
          </div>
        </Reveal>

        <div style={{ padding: '0 16px 24px' }}>
          {verified && (
            <Reveal>
              <div className="anrix-card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderColor: 'var(--anrix-success)', background: 'rgba(34,197,94,0.06)' }}>
                <IonIcon icon={lockClosed} style={{ color: 'var(--anrix-success)', fontSize: 20, flexShrink: 0 }} />
                <span style={{ fontSize: 13 }}>{t('profile.verifiedIdentityLockedPre', 'Your ')}<strong>{t('profile.verifiedIdentity', 'verified identity')}</strong>{t('profile.verifiedIdentityLockedPost', ' (name, ID) is locked. Editing it re-triggers verification.')}</span>
              </div>
            </Reveal>
          )}

          <Reveal>
            <Section title={t('profile.basicDetails', 'Basic details')}>
              <Field label={t('profile.fullName', 'Full name')} value={form.name} onChange={(v) => set('name', v)} disabled={verified} />
              <Field label={t('profile.headline', 'Headline')} placeholder={t('profile.headlinePlaceholder', 'e.g. Expert tiling mason · 8 yrs')} value={form.headline} onChange={(v) => set('headline', v)} />
              <Field label={t('profile.about', 'About')} textarea placeholder={t('profile.aboutPlaceholder', 'Tell customers about your work…')} value={form.bio} onChange={(v) => set('bio', v)} />
            </Section>
          </Reveal>

          <Reveal>
            <Section title={t('profile.location', 'Location')}>
              <div>
                <Label>{t('profile.city', 'City')}</Label>
                <LocationField value={form.city} onChange={(v) => set('city', v)} placeholder={t('profile.cityPlaceholder', 'Bengaluru')} inputStyle={inputStyle} />
              </div>
            </Section>
          </Reveal>

          {isWorker && (
            <Reveal>
              <Section title={t('profile.workRates', 'Work & rates')}>
                <Field label={t('profile.skillsCommaSeparated', 'Skills (comma separated)')} placeholder={t('profile.skillsPlaceholder', 'Tiling, Brickwork, Plaster')} value={form.skills} onChange={(v) => set('skills', v)} />

                {/* Day rate with market guidance */}
                <div>
                  <Label>{t('profile.dayRate', 'Day rate (₹)')}</Label>
                  <input inputMode="numeric" value={form.dayRate || ''} placeholder="800"
                    onChange={(e) => set('dayRate', e.target.value.replace(/\D/g, ''))} style={inputStyle} />
                  {market && (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: 'var(--anrix-primary-soft)', border: '1px solid var(--anrix-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>📊 {t('profile.marketRate', 'Market rate')} · {ROLE_CATALOG[activeRole!].label}</span>
                        <Badge tone="primary">{t('profile.avg', 'Avg')} ₹{market.avg}</Badge>
                      </div>
                      <div className="anrix-muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                        {t('profile.buildersPayPre', 'Builders & contractors near you pay ')}<strong style={{ color: 'var(--anrix-text-strong)' }}>₹{market.min}–₹{market.max}/day</strong>{t('profile.buildersPayPost', ' (from {{count}} offers).', { count: market.samples })}
                      </div>
                      {/* range bar with your position */}
                      <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'var(--anrix-surface)', marginTop: 10 }}>
                        <div style={{ position: 'absolute', left: `${pct(market.min, market.min, market.max)}%`, right: 0, top: 0, bottom: 0, background: 'linear-gradient(90deg, var(--anrix-success), var(--anrix-warning))', borderRadius: 3, opacity: 0.4 }} />
                        {!!form.dayRate && (
                          <div style={{ position: 'absolute', left: `${pct(Number(form.dayRate), market.min, market.max)}%`, top: -3, width: 12, height: 12, borderRadius: '50%', background: 'var(--anrix-primary)', border: '2px solid #fff', transform: 'translateX(-50%)' }} />
                        )}
                      </div>
                      <button onClick={() => set('dayRate', market.avg)} style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>
                        {t('profile.useSuggested', 'Use suggested')} ₹{market.avg}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <Label>{t('profile.serviceRadius', 'Service radius')} · {form.serviceRadiusKm} km</Label>
                  <input type="range" min={1} max={25} value={form.serviceRadiusKm} onChange={(e) => set('serviceRadiusKm', +e.target.value)} style={{ width: '100%', accentColor: 'var(--anrix-primary)' }} />
                </div>
              </Section>
            </Reveal>
          )}

          {/* Roles management */}
          <Reveal>
            <Section title={t('profile.yourRoles', 'Your roles')}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {user.roles.map((r) => (
                  <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                    background: r === user.activeRole ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface-2)',
                    border: r === user.activeRole ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
                    color: r === user.activeRole ? 'var(--anrix-primary-strong)' : 'var(--anrix-text)' }}>
                    {ROLE_CATALOG[r].emoji} {ROLE_CATALOG[r].label}
                    {r === user.activeRole && <IonIcon icon={checkmarkCircle} style={{ color: 'var(--anrix-primary-strong)' }} />}
                  </span>
                ))}
              </div>
              <button onClick={() => history.push('/onboarding')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px dashed var(--anrix-border-strong)', background: 'transparent', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                <IonIcon icon={addOutline} /> {t('profile.addAnotherRole', 'Add another role')}
              </button>
            </Section>
          </Reveal>
        </div>
      </AnimatedPage>
      <IonToast isOpen={!!toast} message={toast} duration={1200} onDidDismiss={() => setToast('')} />
    </PageShell>
  );
}

function pct(v: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
}
/** A titled group of fields inside one framed card — the building block of the form. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', textTransform: 'uppercase', margin: '0 4px 8px' }}>{title}</div>
      <div className="anrix-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>{children}</div>
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>;
}
function Field({ label, value, onChange, placeholder, textarea, disabled }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; disabled?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      {textarea ? (
        <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} rows={3}
          style={{ ...inputStyle, height: 'auto', paddingTop: 12, resize: 'vertical' }} />
      ) : (
        <input value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, opacity: disabled ? 0.6 : 1 }} />
      )}
    </div>
  );
}
const inputStyle: React.CSSProperties = {
  width: '100%', height: 52, borderRadius: 12, border: '1.5px solid var(--anrix-border)', background: 'var(--anrix-surface)',
  padding: '0 14px', fontSize: 15, color: 'var(--anrix-text-strong)', outline: 'none',
};
