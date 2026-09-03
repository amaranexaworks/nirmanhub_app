import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IonMenu, IonHeader, IonContent, IonList, IonItem, IonLabel, IonIcon, IonMenuToggle, IonToggle, useIonRouter,
} from '@ionic/react';
import {
  walletOutline, notificationsOutline, bookmarkOutline, giftOutline, shieldCheckmarkOutline,
  settingsOutline, helpCircleOutline, moonOutline, logOutOutline, swapHorizontalOutline, chevronForward, peopleCircleOutline,
  megaphoneOutline, fileTrayFullOutline, timeOutline,
} from 'ionicons/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@stores/authStore';
import { useUiStore } from '@stores/uiStore';
import { rbacApi } from '@services/api/rbacApi';
import { authApi } from '@services/api/authApi';
import { Avatar } from '@design/primitives';
import { ROLE_CATALOG, ARCHETYPE_LABEL, archetypeOf, type Role, type Archetype } from '@models/roles';
import { LANGUAGES } from '@i18n/config';
import { TAB_CONFIGS } from './tabConfigs';

/**
 * Routes each archetype's home dashboard already surfaces as quick-action tiles.
 * Menu entries pointing at these are hidden so the drawer doesn't repeat what's
 * one tap away on Home. Notifications is always hidden — the header bell covers it.
 */
const HOME_ACTION_ROUTES: Partial<Record<Archetype, string[]>> = {
  orchestrator: ['/app/workforce', '/app/wage-register', '/app/credit', '/app/order', '/app/marketplace', '/app/requirements'],
};

/** Professional slide-in side drawer. Profile header is fixed (in IonHeader); the nav list scrolls. */
export function AppMenu() {
  const history = useHistory();
  const router = useIonRouter();
  const { t } = useTranslation();
  const { user, isAuthenticated, hasOnboarded, setActiveRole, applyAuth, logout } = useAuthStore();

  // Role code → id map (for the real switch-role call).
  const { data: bootstrap } = useQuery({ queryKey: ['rbac', 'bootstrap'], queryFn: rbacApi.bootstrap, staleTime: 60 * 60_000, enabled: isAuthenticated });
  const roleId = (code: Role) => bootstrap?.roles.find((r) => r.rle_cd === code)?.rle_id;

  const switchRole = async (r: Role) => {
    if (r === user?.activeRole) return;
    const id = roleId(r);
    setActiveRole(r); // optimistic
    try {
      if (id) { const res = await authApi.switchRole(id); applyAuth(res.token, res.user); }
    } catch { /* keep optimistic value */ }
    history.replace('/app/home');
  };
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);

  const enabled = isAuthenticated && hasOnboarded && !!user;

  // Routes already reachable from the active role's Home (bottom tabs + dashboard
  // quick-actions) plus Notifications (header bell) — hidden from the drawer so it
  // doesn't duplicate what's already on Home.
  const archetype = user?.activeRole ? archetypeOf(user.activeRole) : undefined;
  const hiddenRoutes = new Set<string>([
    '/app/notifications',
    ...(archetype ? TAB_CONFIGS[archetype].map((t) => `/app/${t.key}`) : []),
    ...(archetype ? HOME_ACTION_ROUTES[archetype] ?? [] : []),
  ]);
  const doLogout = () => {
    // Send the server logout while the token is still in the store (the axios
    // request interceptor reads it on a microtask), THEN tear down local state
    // and navigate. Clearing the store first would strip the auth header and the
    // backend would reject the logout with 401. Don't trap the user if the
    // network hangs — tear down after the call settles or a short timeout.
    const teardown = () => { logout(); router.push('/auth/login', 'root', 'replace'); };
    void Promise.race([
      authApi.logout(),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]).finally(teardown);
  };

  return (
    <IonMenu contentId="main" side="start" disabled={!enabled} type="overlay">
      {/* Fixed profile header — does not scroll */}
      <IonHeader className="ion-no-border">
        <div style={{ padding: '28px 20px 20px', background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', borderBottom: '1px solid var(--anrix-hero-border)' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={user.name} size={44} verified={user.kycTier === 'verified'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 13 }}>{user.phone || user.email}</div>
                <div style={{ marginTop: 6, display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: 'var(--anrix-hero-chip)', fontSize: 12, fontWeight: 600 }}>
                  {user.activeRole ? ARCHETYPE_LABEL[archetypeOf(user.activeRole)] : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      </IonHeader>

      {/* Scrollable nav */}
      <IonContent>
        {user && (
          <>
            <div style={sectionLabel}>{t('menu.section')}</div>
            <IonList>
              {[
                { icon: megaphoneOutline, labelKey: 'menu.openWorkBoard', go: '/app/requirements' },
                { icon: fileTrayFullOutline, labelKey: 'menu.myPosts', go: '/app/my-posts' },
                // Shown for orchestrators, OR any user an admin granted the
                // Workforce-management feature (manage_teams capability).
                ...(archetype === 'orchestrator' || (user.capabilities?.includes('manage_teams') ?? false)
                  ? [{ icon: peopleCircleOutline, labelKey: 'menu.workforce', go: '/app/workforce' }]
                  : []),
                { icon: timeOutline, labelKey: 'menu.history', go: '/app/history' },
                { icon: shieldCheckmarkOutline, labelKey: 'menu.kyc', go: '/app/kyc' },
                { icon: walletOutline, labelKey: 'menu.wallet', go: '/app/wallet' },
                { icon: notificationsOutline, labelKey: 'menu.notifications', go: '/app/notifications' },
                { icon: bookmarkOutline, labelKey: 'menu.saved', go: '/app/saved' },
                { icon: giftOutline, labelKey: 'menu.refer', go: '/app/refer' },
                { icon: helpCircleOutline, labelKey: 'menu.help', go: '/app/help' },
                { icon: settingsOutline, labelKey: 'menu.settings', go: '/app/settings' },
              ].filter((r) => !hiddenRoutes.has(r.go)).map((r) => (
                <IonMenuToggle key={r.go} autoHide={false}>
                  <IonItem button detail={false} routerLink={r.go}>
                    <IonIcon slot="start" icon={r.icon} style={{ color: 'var(--anrix-text-muted)' }} />
                    <IonLabel>{t(r.labelKey)}</IonLabel>
                    <IonIcon slot="end" icon={chevronForward} style={{ color: 'var(--anrix-text-muted)', fontSize: 16 }} />
                  </IonItem>
                </IonMenuToggle>
              ))}
            </IonList>

            {user.roles.length > 1 && (
              <>
                <div style={sectionLabel}>{t('menu.switchRole')}</div>
                <IonList>
                  {user.roles.map((r) => (
                    <IonMenuToggle key={r} autoHide={false}>
                      <IonItem button detail={false} onClick={() => { void switchRole(r); }}>
                        <span slot="start" style={{ fontSize: 20, width: 24, textAlign: 'center' }}>{ROLE_CATALOG[r].emoji}</span>
                        <IonLabel style={{ fontWeight: r === user.activeRole ? 700 : 400 }}>{ROLE_CATALOG[r].label}</IonLabel>
                        {r === user.activeRole && <IonIcon slot="end" icon={swapHorizontalOutline} style={{ color: 'var(--anrix-primary-strong)' }} />}
                      </IonItem>
                    </IonMenuToggle>
                  ))}
                </IonList>
              </>
            )}

            <div style={sectionLabel}>{t('menu.language')}</div>
            <div style={{ display: 'flex', gap: 8, padding: '0 16px 8px' }}>
              {LANGUAGES.map((l) => {
                const on = language === l.code;
                return (
                  <button key={l.code} onClick={() => setLanguage(l.code)} style={{
                    flex: 1, height: 44, borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                    border: on ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
                    background: on ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)',
                    color: on ? 'var(--anrix-primary-strong)' : 'var(--anrix-text)',
                  }}>{l.native}</button>
                );
              })}
            </div>

            <IonList>
              <IonItem>
                <IonIcon slot="start" icon={moonOutline} style={{ color: 'var(--anrix-text-muted)' }} />
                <IonLabel>{t('menu.darkMode')}</IonLabel>
                <IonToggle slot="end" checked={theme === 'dark'} onIonChange={(e) => setTheme(e.detail.checked ? 'dark' : 'light')} />
              </IonItem>
            </IonList>

            <div style={{ padding: 16 }}>
              <button onClick={doLogout} style={{
                width: '100%', height: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                borderRadius: 12, border: '1.5px solid var(--anrix-danger)', background: 'transparent', color: 'var(--anrix-danger)',
                fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}>
                <IonIcon icon={logOutOutline} /> {t('menu.logout')}
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '0 0 24px', color: 'var(--anrix-text-muted)', fontSize: 12 }}>Nirmanam · v0.1.0</div>
          </>
        )}
      </IonContent>
    </IonMenu>
  );
}

const sectionLabel: React.CSSProperties = {
  padding: '16px 16px 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
  color: 'var(--anrix-text-muted)', textTransform: 'uppercase',
};
