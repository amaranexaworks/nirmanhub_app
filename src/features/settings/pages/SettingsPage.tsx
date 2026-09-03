import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonIcon, IonList, IonItem, IonLabel, IonToggle } from '@ionic/react';
import {
  personOutline, shieldCheckmarkOutline, notificationsOutline, walletOutline,
  moonOutline, languageOutline, logOutOutline, chevronForward, lockClosedOutline,
} from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { useAuthStore } from '@stores/authStore';
import { useUiStore } from '@stores/uiStore';
import { authApi } from '@services/api/authApi';

/** Account & app settings — real navigation + working theme/language toggles. */
export function SettingsPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);

  const doLogout = () => { void authApi.logout(); logout(); history.replace('/auth/login'); };

  const rows = [
    { icon: personOutline, label: t('settings.editProfile', 'Edit profile'), go: '/app/profile/edit' },
    { icon: shieldCheckmarkOutline, label: t('settings.identityVerificationKyc', 'Identity verification (KYC)'), go: '/app/kyc' },
    { icon: walletOutline, label: t('settings.walletPayments', 'Wallet & payments'), go: '/app/wallet' },
    { icon: notificationsOutline, label: t('settings.notifications', 'Notifications'), go: '/app/notifications' },
  ];

  return (
    <PageShell title={t('settings.settings', 'Settings')} showBack>
      <AnimatedPage>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--anrix-primary-soft)', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800, color: 'var(--anrix-primary-strong)' }}>
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{user?.name}</div>
            <div className="anrix-muted" style={{ fontSize: 13 }}>{user?.phone}</div>
          </div>
        </div>

        <div style={sectionLabel}>{t('settings.account', 'ACCOUNT')}</div>
        <IonList>
          {rows.map((r) => (
            <IonItem key={r.label} button detail={false} onClick={() => history.push(r.go)}>
              <IonIcon slot="start" icon={r.icon} style={{ color: 'var(--anrix-primary-strong)' }} />
              <IonLabel>{r.label}</IonLabel>
              <IonIcon slot="end" icon={chevronForward} style={{ color: 'var(--anrix-text-muted)', fontSize: 16 }} />
            </IonItem>
          ))}
        </IonList>

        <div style={sectionLabel}>{t('settings.preferences', 'PREFERENCES')}</div>
        <IonList>
          <IonItem>
            <IonIcon slot="start" icon={moonOutline} style={{ color: 'var(--anrix-text-muted)' }} />
            <IonLabel>{t('settings.darkMode', 'Dark mode')}</IonLabel>
            <IonToggle slot="end" checked={theme === 'dark'} onIonChange={(e) => setTheme(e.detail.checked ? 'dark' : 'light')} />
          </IonItem>
          <IonItem>
            <IonIcon slot="start" icon={languageOutline} style={{ color: 'var(--anrix-text-muted)' }} />
            <IonLabel>{t('settings.language', 'Language')}</IonLabel>
            <div slot="end" style={{ display: 'flex', gap: 6 }}>
              {(['en', 'hi', 'te'] as const).map((l) => (
                <button key={l} onClick={() => setLanguage(l)} style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: language === l ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
                  background: language === l ? 'var(--anrix-primary-soft)' : 'transparent',
                  color: language === l ? 'var(--anrix-primary)' : 'var(--anrix-text)',
                }}>{l.toUpperCase()}</button>
              ))}
            </div>
          </IonItem>
        </IonList>

        <div style={sectionLabel}>{t('settings.security', 'SECURITY')}</div>
        <IonList>
          <IonItem button detail={false} onClick={() => history.push('/app/change-password')}>
            <IonIcon slot="start" icon={lockClosedOutline} style={{ color: 'var(--anrix-primary-strong)' }} />
            <IonLabel>{t('settings.changePasswordRow', 'Change password')}</IonLabel>
            <IonIcon slot="end" icon={chevronForward} style={{ color: 'var(--anrix-text-muted)', fontSize: 16 }} />
          </IonItem>
          <IonItem button detail={false} onClick={doLogout}>
            <IonIcon slot="start" icon={logOutOutline} style={{ color: 'var(--anrix-danger)' }} />
            <IonLabel style={{ color: 'var(--anrix-danger)', fontWeight: 700 }}>{t('settings.logOut', 'Log out')}</IonLabel>
          </IonItem>
        </IonList>

        <div style={{ textAlign: 'center', padding: '18px 0 28px', color: 'var(--anrix-text-muted)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <IonIcon icon={lockClosedOutline} /> Nirmanam · v0.1.0
        </div>
      </AnimatedPage>
    </PageShell>
  );
}

const sectionLabel: React.CSSProperties = { padding: '16px 16px 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--anrix-text-muted)', textTransform: 'uppercase' };
