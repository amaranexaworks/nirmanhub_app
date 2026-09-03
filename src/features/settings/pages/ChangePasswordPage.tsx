import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { IonIcon, useIonToast } from '@ionic/react';
import { lockClosedOutline, eyeOutline, eyeOffOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { GradientButton } from '@design/primitives';
import { profileApi } from '@services/api/profileApi';

/** Change/reset the logged-in user's password (from Profile → Settings). */
export function ChangePasswordPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const [toast] = useIonToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const valid = next.length >= 6 && next === confirm;

  const save = async () => {
    setError('');
    if (next.length < 6) { setError(t('settings.passwordMinLength', 'New password must be at least 6 characters.')); return; }
    if (next !== confirm) { setError(t('settings.passwordsDoNotMatch', 'Passwords do not match.')); return; }
    setBusy(true);
    try {
      await profileApi.changePassword(current, next);
      void toast({ message: t('settings.passwordUpdated', 'Password updated ✓'), duration: 1500, color: 'success', position: 'top' });
      setTimeout(() => history.goBack(), 700);
    } catch (e: any) {
      setError(e.message || t('settings.couldNotUpdatePassword', 'Could not update password.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title={t('settings.changePassword', 'Change Password')} showBack footer={<GradientButton disabled={!valid || busy} onClick={() => void save()}>{busy ? t('settings.updating', 'Updating…') : t('settings.updatePassword', 'Update password')}</GradientButton>}>
      <AnimatedPage>
        <div style={{ padding: 16 }}>
          <div className="anrix-card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: 12 }}>
            <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: 22, color: 'var(--anrix-primary-strong)' }} />
            <span style={{ fontSize: 13, color: 'var(--anrix-text)' }}>{t('settings.passwordHint', "Use a strong password you don't use elsewhere. You'll stay logged in on this device.")}</span>
          </div>

          <Label>{t('settings.currentPassword', 'Current password')}</Label>
          <PwField value={current} onChange={setCurrent} show={show} placeholder={t('settings.leaveBlankIfNever', 'Leave blank if you never set one')} />

          <Label>{t('settings.newPassword', 'New password')}</Label>
          <PwField value={next} onChange={setNext} show={show} placeholder={t('settings.atLeast6Chars', 'At least 6 characters')} />

          <Label>{t('settings.confirmNewPassword', 'Confirm new password')}</Label>
          <PwField value={confirm} onChange={setConfirm} show={show} placeholder={t('settings.reEnterNewPassword', 'Re-enter new password')}
            onEnter={() => valid && void save()} />

          <button onClick={() => setShow((s) => !s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--anrix-primary-strong)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: '4px 0' }}>
            <IonIcon icon={show ? eyeOffOutline : eyeOutline} /> {show ? t('settings.hidePasswords', 'Hide passwords') : t('settings.showPasswords', 'Show passwords')}
          </button>

          {error && <p style={{ color: '#e5484d', fontSize: 12.5, fontWeight: 600, margin: '10px 0 0' }}>{error}</p>}
        </div>
      </AnimatedPage>
    </PageShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', textTransform: 'uppercase', margin: '4px 0 8px' }}>{children}</div>;
}
function PwField({ value, onChange, show, placeholder, onEnter }: { value: string; onChange: (v: string) => void; show: boolean; placeholder: string; onEnter?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', height: 54, borderRadius: 14, border: '1.5px solid var(--anrix-border)', background: 'var(--anrix-surface)', marginBottom: 16 }}>
      <IonIcon icon={lockClosedOutline} style={{ fontSize: 19, color: 'var(--anrix-text-muted)', flexShrink: 0 }} />
      <input type={show ? 'text' : 'password'} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        style={{ flex: 1, width: '100%', minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, fontWeight: 600, color: 'var(--anrix-text-strong)', padding: 0 }} />
    </div>
  );
}
