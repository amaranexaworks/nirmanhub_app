import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonContent, IonIcon, useIonRouter } from '@ionic/react';
import { AnimatePresence, motion } from 'framer-motion';
import { arrowBack, checkmarkCircle, chevronDown, closeCircle, close } from 'ionicons/icons';
import { RouteRedirect } from '@app/routing/RouteRedirect';
import { SearchField } from '@components/search/SearchField';
import { useAuthStore } from '@stores/authStore';
import { rbacApi } from '@services/api/rbacApi';
import { authApi } from '@services/api/authApi';
import { ROLE_CATALOG, ARCHETYPE_LABEL, archetypeOf, type Archetype, type Role } from '@models/roles';
import { Wordmark } from '@design/brand/Logo';
import { staggerContainer, fadeInUp } from '@design/motion/variants';
import { haptic } from '@lib/haptics';

const ALL_ROLES = Object.keys(ROLE_CATALOG) as Role[];
const ARCH_ORDER: Archetype[] = ['seeker', 'worker', 'expert', 'orchestrator', 'vendor', 'financier'];

export function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useIonRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const applyAuth = useAuthStore((s) => s.applyAuth);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const logout = useAuthStore((s) => s.logout);
  const [selected, setSelected] = useState<Role[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Role catalog from the DB — used to map picked role codes → role ids for assignment.
  const { data: bootstrap } = useQuery({ queryKey: ['rbac', 'bootstrap'], queryFn: rbacApi.bootstrap, staleTime: 60 * 60_000 });
  const roleIdByCode = useMemo(() => {
    const m = new Map<string, number>();
    (bootstrap?.roles ?? []).forEach((r) => m.set(r.rle_cd, r.rle_id));
    return m;
  }, [bootstrap]);

  // All roles grouped by category, filtered by the search query.
  // NOTE: hooks must run before any conditional return, otherwise flipping
  // `isAuthenticated` (logout) renders fewer hooks and React crashes.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARCH_ORDER.map((arch) => ({
      arch,
      roles: ALL_ROLES.filter(
        (r) => archetypeOf(r) === arch && (!q || ROLE_CATALOG[r].label.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.roles.length > 0);
  }, [query]);

  const toggle = (role: Role) => {
    void haptic.light();
    setSelected((p) => (p.includes(role) ? p.filter((r) => r !== role) : [...p, role]));
  };

  const start = async () => {
    if (!selected.length || !user) return;
    if (!roleIdByCode.size) { setError(t('onboard.stillLoadingRoles', 'Still loading roles — try again in a moment.')); return; }
    setError('');
    setBusy(true);
    try {
      // Persist each picked role; the first becomes the primary/active role.
      for (let i = 0; i < selected.length; i++) {
        const rleId = roleIdByCode.get(selected[i]);
        if (rleId) await rbacApi.assignRole(user.id, rleId, i === 0);
      }
      const firstId = roleIdByCode.get(selected[0]);
      if (firstId) {
        const res = await authApi.switchRole(firstId);   // activates + mints a fresh token
        applyAuth(res.token, res.user);
      } else {
        applyAuth(useAuthStore.getState().token!, await authApi.me());
      }
      completeOnboarding();
      void haptic.medium();
      router.push('/app/home', 'root', 'replace');
    } catch (e: any) {
      setError(e.message || t('onboard.couldNotSave', 'Could not save your roles. Try again.'));
    } finally {
      setBusy(false);
    }
  };
  // logout() flips isAuthenticated → the guard renders <RouteRedirect> for a
  // single clean navigation back to login (no double-nav race).
  const exitToLogin = () => { logout(); };

  if (!isAuthenticated) return <RouteRedirect to="/auth/login" />;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingInlineStart: 4 }}>
              <button onClick={exitToLogin} aria-label={t('onboard.back', 'Back')} style={backBtn}>
                <IonIcon icon={arrowBack} style={{ fontSize: 20 }} />
              </button>
              <Wordmark size={22} onDark />
            </div>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: '10px 16px 140px' }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '6px 4px 4px' }}>{t('onboard.heading', "What's your job role?")}</h1>
          <p className="anrix-muted" style={{ margin: '0 4px 18px' }}>
            {t('onboard.subtitle', 'Pick your role from the list. You can add more than one anytime.')}
          </p>

          {/* ---- Dropdown trigger ---- */}
          <button onClick={() => { void haptic.light(); setOpen((o) => !o); }} style={triggerBox(open)}>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 15, fontWeight: 600, color: selected.length ? 'var(--anrix-text-strong)' : 'var(--anrix-text-muted)' }}>
              {selected.length ? t('onboard.rolesSelected', '{{count}} role(s) selected', { count: selected.length }) : t('onboard.selectYourJobRole', 'Select your job role')}
            </span>
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ display: 'grid' }}>
              <IonIcon icon={chevronDown} style={{ fontSize: 18, color: 'var(--anrix-text-muted)' }} />
            </motion.span>
          </button>

          {/* ---- Selected chips ---- */}
          {selected.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {selected.map((role) => (
                <motion.button key={role} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  onClick={() => toggle(role)} style={chip}>
                  <span style={{ fontSize: 15 }}>{ROLE_CATALOG[role].emoji}</span>
                  {ROLE_CATALOG[role].label}
                  <IonIcon icon={closeCircle} style={{ fontSize: 16, color: 'var(--anrix-primary-strong)' }} />
                </motion.button>
              ))}
            </div>
          )}

          {/* ---- Dropdown panel ---- */}
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: 12, border: '1px solid var(--anrix-border)', borderRadius: 16, background: 'var(--anrix-surface)', boxShadow: 'var(--anrix-shadow-2)', overflow: 'hidden' }}>
                  <div style={{ padding: 12, borderBottom: '1px solid var(--anrix-border)' }}>
                    <SearchField value={query} onChange={setQuery} placeholder={t('onboard.searchRoles', 'Search roles…')} />
                  </div>
                  <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                    {groups.map((g) => (
                      <div key={g.arch}>
                        <div style={groupLabel}>{ARCHETYPE_LABEL[g.arch]}</div>
                        <motion.div variants={staggerContainer(0.02)} initial="hidden" animate="show">
                          {g.roles.map((role) => {
                            const active = selected.includes(role);
                            return (
                              <motion.button key={role} variants={fadeInUp} onClick={() => toggle(role)} style={optionRow(active)}>
                                <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', fontSize: 17, flexShrink: 0, background: active ? '#fff' : 'var(--anrix-surface-2)' }}>
                                  {ROLE_CATALOG[role].emoji}
                                </span>
                                <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600, color: 'var(--anrix-text-strong)' }}>{ROLE_CATALOG[role].label}</span>
                                <IonIcon icon={checkmarkCircle} style={{ fontSize: 20, color: 'var(--anrix-primary-strong)', opacity: active ? 1 : 0 }} />
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      </div>
                    ))}
                    {groups.length === 0 && (
                      <div style={{ textAlign: 'center', padding: 32, color: 'var(--anrix-text-muted)', fontSize: 14 }}>{t('onboard.noRolesMatch', 'No roles match "{{query}}".', { query })}</div>
                    )}
                  </div>
                  <button onClick={() => setOpen(false)} style={doneBtn}>
                    <IonIcon icon={close} style={{ fontSize: 16 }} /> {t('onboard.done', 'Done')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </IonContent>

      {/* ---- sticky bottom bar ---- */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '14px 16px',
        paddingBottom: 'calc(14px + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, var(--anrix-bg) 72%, transparent)' }}>
        {error && <p style={{ textAlign: 'center', color: '#e5484d', fontSize: 12.5, fontWeight: 600, margin: '0 0 8px' }}>{error}</p>}
        <button onClick={start} disabled={!selected.length || busy} style={cta(!!selected.length && !busy)}>
          {busy
            ? t('onboard.settingUp', 'Setting up…')
            : selected.length
              ? t('onboard.continueWith', 'Continue with {{count}} role(s)', { count: selected.length })
              : t('onboard.selectRoleToContinue', 'Select a role to continue')}
        </button>
      </div>
    </IonPage>
  );
}

const triggerBox = (open: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: 56, padding: '0 16px', borderRadius: 16, cursor: 'pointer',
  border: `1.5px solid ${open ? 'var(--anrix-primary)' : 'var(--anrix-border)'}`,
  background: 'var(--anrix-surface)', boxShadow: open ? 'var(--anrix-ring-primary)' : 'var(--anrix-shadow-1)',
  transition: 'all var(--anrix-motion-fast)',
});
const chip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 999, cursor: 'pointer',
  border: '1.5px solid var(--anrix-primary)', background: 'var(--anrix-primary-soft)', color: 'var(--anrix-text-strong)',
  fontSize: 13, fontWeight: 700,
};
const optionRow = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 14px', cursor: 'pointer', border: 'none',
  background: active ? 'var(--anrix-primary-soft)' : 'transparent',
});
const groupLabel: React.CSSProperties = { padding: '12px 14px 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', textTransform: 'uppercase' };
const doneBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', height: 46, border: 'none',
  borderTop: '1px solid var(--anrix-border)', background: 'var(--anrix-surface-2)', color: 'var(--anrix-primary-strong)',
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
};
const backBtn: React.CSSProperties = { display: 'grid', placeItems: 'center', width: 38, height: 38, flexShrink: 0, borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.16)', color: '#ffffff', cursor: 'pointer' };
const cta = (enabled: boolean): React.CSSProperties => ({
  width: '100%', height: 54, border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: enabled ? 'pointer' : 'not-allowed',
  background: enabled ? 'var(--anrix-primary)' : 'var(--anrix-surface-2)', color: enabled ? 'var(--anrix-on-primary)' : 'var(--anrix-text-muted)',
  boxShadow: enabled ? '0 8px 22px rgba(22, 24, 29,0.3)' : 'none', transition: 'all var(--anrix-motion-fast)',
});
