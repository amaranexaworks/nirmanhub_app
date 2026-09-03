import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IonToggle, IonIcon, useIonToast } from '@ionic/react';
import { locationOutline, cashOutline, calendarOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Reveal } from '@components/motion';
import { GradientButton } from '@design/primitives';
import { useAuthStore } from '@stores/authStore';
import { profileApi } from '@services/api/profileApi';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function AvailabilityPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const [toast] = useIonToast();
  const [available, setAvailable] = useState(true);
  const [radius, setRadius] = useState(user?.serviceRadiusKm ?? 5);
  const [rate, setRate] = useState(user?.dayRate ?? 800);
  const [days, setDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [busy, setBusy] = useState(false);

  const toggleDay = (d: string) =>
    setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  const save = async () => {
    setBusy(true);
    try {
      await profileApi.update({ dayRate: rate, serviceRadiusKm: radius });
      patchUser({ dayRate: rate, serviceRadiusKm: radius });
      void toast({ message: t('avail.savedToast', 'Availability saved ✓'), duration: 1400, color: 'success', position: 'top' });
    } catch (e: any) {
      void toast({ message: e.message || t('avail.couldNotSave', 'Could not save'), duration: 1800, color: 'danger', position: 'top' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title={t('avail.title', 'Availability')} footer={<GradientButton disabled={busy} onClick={() => void save()}>{busy ? t('avail.saving', 'Saving…') : t('avail.saveAvailability', 'Save availability')}</GradientButton>}>
      <AnimatedPage>
        <Reveal>
          <div
            className="anrix-card"
            style={{ margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderLeft: `4px solid ${available ? 'var(--anrix-success)' : 'var(--anrix-text-muted)'}` }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{available ? t('avail.availableToday', "You're available today") : t('avail.offline', 'You are offline')}</div>
              <div className="anrix-muted" style={{ fontSize: 13 }}>{available ? t('avail.canFindYou', 'Employers can find & hire you') : t('avail.turnOnHint', 'Turn on to receive job matches')}</div>
            </div>
            <IonToggle checked={available} onIonChange={(e) => setAvailable(e.detail.checked)} />
          </div>
        </Reveal>

        <Reveal>
          <div className="anrix-card" style={{ margin: '0 16px 16px' }}>
            <Row icon={locationOutline} label={t('avail.serviceRadius', 'Service radius')} value={`${radius} km`} />
            <input type="range" min={1} max={25} value={radius} onChange={(e) => setRadius(+e.target.value)} style={range} />
          </div>
        </Reveal>

        <Reveal>
          <div className="anrix-card" style={{ margin: '0 16px 16px' }}>
            <Row icon={cashOutline} label={t('avail.dayRate', 'Day rate')} value={`₹${rate}`} />
            <input type="range" min={300} max={2500} step={50} value={rate} onChange={(e) => setRate(+e.target.value)} style={range} />
          </div>
        </Reveal>

        <Reveal>
          <div className="anrix-card" style={{ margin: '0 16px 16px' }}>
            <Row icon={calendarOutline} label={t('avail.workingDays', 'Working days')} value={`${days.length}/7`} />
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              {DAYS.map((d) => {
                const on = days.includes(d);
                return (
                  <button key={d} onClick={() => toggleDay(d)} style={{
                    flex: 1, height: 42, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: on ? '1.5px solid transparent' : '1.5px solid var(--anrix-border)',
                    background: on ? 'var(--anrix-primary)' : 'var(--anrix-surface)',
                    color: on ? '#fff' : 'var(--anrix-text-muted)',
                  }}>{t(`avail.day_${d}`, d)}</button>
                );
              })}
            </div>
          </div>
        </Reveal>
      </AnimatedPage>
    </PageShell>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
        <IonIcon icon={icon} style={{ color: 'var(--anrix-primary-strong)', fontSize: 20 }} /> {label}
      </span>
      <strong style={{ color: 'var(--anrix-primary-strong)' }}>{value}</strong>
    </div>
  );
}

const range: React.CSSProperties = { width: '100%', marginTop: 12, accentColor: 'var(--anrix-primary)' };
