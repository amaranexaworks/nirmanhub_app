import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonPage, IonContent, IonIcon } from '@ionic/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  chevronDown, chevronBackOutline, personOutline, lockClosedOutline, eyeOutline, eyeOffOutline, constructOutline, checkmark, searchOutline,
  shieldCheckmarkOutline, peopleOutline, locationOutline, arrowForward,
} from 'ionicons/icons';
import { LogoMark } from '@design/brand/Logo';
import { BRAND } from '@design/brand/brand';
import { ConstructionBackdrop } from './ConstructionBackdrop';
import { useAuthStore } from '@stores/authStore';
import { authApi } from '@services/api/authApi';
import { profileApi } from '@services/api/profileApi';
import { getCurrentLocation } from '@services/location/geolocation';
import { ROLE_CATALOG, ROLE_IMAGE, ARCHETYPE_LABEL, archetypeOf, type Archetype, type Role } from '@models/roles';
import { haptic } from '@lib/haptics';

const ARCH_ORDER: Archetype[] = ['seeker', 'worker', 'expert', 'orchestrator', 'vendor', 'financier'];
const ALL_ROLES = Object.keys(ROLE_CATALOG) as Role[];
// Every role, grouped by archetype, for the single searchable role picker. The
// archetype is a header only — it's derived from whichever role the user picks.
const ROLE_OPTIONS: Opt[] = ARCH_ORDER.flatMap((a) =>
  ALL_ROLES.filter((r) => archetypeOf(r) === a).map((r) => ({
    value: r, label: ROLE_CATALOG[r].label, emoji: ROLE_CATALOG[r].emoji, img: ROLE_IMAGE[r], group: ARCHETYPE_LABEL[a],
  })),
);

/**
 * White + gold auth screen. Clean brand header (no floating photos) over a single
 * form. Signup collects name / phone / password and the role — the role is picked
 * inline via one searchable dropdown listing every role (grouped by category).
 * The archetype is derived from the chosen role. No OTP, no separate onboarding.
 */
export function LoginScreen() {
  const { t } = useTranslation();
  const history = useHistory();
  const applyAuth = useAuthStore((s) => s.applyAuth);
  const patchUser = useAuthStore((s) => s.patchUser);

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [focus, setFocus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Role is chosen inline in the signup form via one searchable picker. The
  // archetype is derived from whichever role the user selects.
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const pickRole = (r: Role) => { setSelectedRole(r); void haptic.light(); };

  // Back always returns to the guest storefront (the public browse landing), so a
  // visitor who taps "Log in / Sign up" is never stranded on the auth screen.
  const goBack = () => {
    void haptic.light();
    history.replace('/browse');
  };

  const validPhone = phone.length === 10;
  const credsValid = name.trim().length >= 2 && validPhone && password.length >= 6;
  const canSubmit = mode === 'login'
    ? validPhone && password.length >= 1
    : credsValid && selectedRole !== null;

  // Explain *why* the CTA is disabled once the user has started typing, so a
  // greyed-out button never feels broken. Returns the first unmet requirement.
  const disabledReason = ((): string | null => {
    const touched = name.length > 0 || phone.length > 0 || password.length > 0;
    if (!touched) return null;
    if (mode === 'signup' && name.trim().length < 2) return t('auth.needName', 'Enter your name');
    if (!validPhone) return t('auth.needPhone', 'Enter a 10-digit mobile number');
    if (mode === 'signup' ? password.length < 6 : password.length < 1)
      return mode === 'signup'
        ? t('auth.needPassword', 'Password must be at least 6 characters')
        : t('auth.needPasswordLogin', 'Enter your password');
    if (mode === 'signup' && selectedRole === null) return t('auth.needRole', 'Select your role');
    return null;
  })();

  // On sign-in, grab the device location once (prompts for permission) and save it.
  const captureLocation = async () => {
    try {
      const loc = await getCurrentLocation();
      patchUser({ location: loc });
      void profileApi.update({ location: loc }).catch(() => {});
    } catch { /* best-effort */ }
  };

  const afterAuth = (user: { roles: unknown[]; activeRole?: Role }) => {
    void haptic.medium();
    void captureLocation();
    // Resume where the guest was headed (e.g. tapped "Add" while browsing) if we saved
    // a destination; otherwise land on Home. Onboarding always wins if no role yet.
    const resumeTo = sessionStorage.getItem('nirmaan_post_login');
    sessionStorage.removeItem('nirmaan_post_login');
    history.replace(user.roles.length > 0 ? (resumeTo || '/app/home') : '/onboarding');
  };

  const submit = async () => {
    if (loading || !canSubmit) return;
    setError(''); setInfo('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        // Create the account, but do NOT auto-enter the app — the user must log in.
        await authApi.register(name.trim(), phone, password, selectedRole ? [selectedRole] : []);
        setMode('login');
        setName(''); setPassword(''); setShowPw(false); setSelectedRole(null);
        setInfo(t('auth.accountCreated', 'Account created! Please log in to continue.')); // phone stays prefilled
        void haptic.medium();
      } else {
        const res = await authApi.login(phone, password);
        // Admins are managed from the separate web console — no admin UI in the app.
        if (res.user.activeRole && archetypeOf(res.user.activeRole) === 'admin') {
          setError(t('auth.adminUseWeb', 'Admin access is available on the web console, not the app.'));
          return;
        }
        applyAuth(res.token, res.user);
        afterAuth(res.user);
      }
    } catch (e: any) {
      setError(e.message || (mode === 'signup' ? t('auth.couldNotCreate', 'Could not create account.') : t('auth.loginFailed', 'Login failed.')));
    } finally {
      setLoading(false);
    }
  };

  // Switching tabs starts a clean form — signup details must not carry into login.
  const switchMode = (m: 'login' | 'signup') => {
    if (m === mode) return;
    setMode(m);
    setName(''); setPhone(''); setPassword(''); setShowPw(false); setError(''); setInfo('');
    setSelectedRole(null);
    void haptic.light();
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        {/* Soft, near-white cream backdrop with only a whisper of warmth up top, so the
            white form card still reads as a distinct, elevated surface (not white-on-white).
            The top-right warmth comes from the localized sun in ConstructionBackdrop. */}
        <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, #f7f4ef 0%, #f6f4f0 40%, #f4f3f2 100%)' }} />
        {/* Construction skyline + sun watermark behind the header */}
        <ConstructionBackdrop />
        <div style={{ position: 'relative', minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
          padding: 'calc(env(safe-area-inset-top) + 20px) 20px calc(env(safe-area-inset-bottom) + 20px)' }}>
          {/* Back to browsing — small pill in the top-left so a guest is never stranded
              on the auth screen (they reach it from the storefront's Log in / Sign up). */}
          <button onClick={goBack} aria-label={t('common.back', 'Back')} style={backBtn}>
            <IonIcon icon={chevronBackOutline} style={{ fontSize: 22, color: 'var(--anrix-text-strong)' }} />
          </button>

          {/* Small fixed top gap — the header/form/trust strip flow as one group from the
              top (no flex:1 spacers, which left a big empty gap on tall/desktop screens). */}
          <div aria-hidden style={{ height: 8 }} />

          {/* ---- Brand header (logo + trust row, no photos) ---- */}
          <div style={{ padding: '0 0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <LogoMark size={78} />
            <h1 style={{ margin: '10px 0 2px', fontSize: 26, fontWeight: 900, letterSpacing: '-0.01em' }}>
              <span style={{ color: 'var(--anrix-primary)' }}>{BRAND.mark}</span>
              <span style={{ color: '#16223e' }}> {t('auth.hub', 'Hub')}</span>
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--anrix-text)' }}>{BRAND.tagline}</p>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, fontWeight: 700, color: 'var(--anrix-text-strong)' }}>
              {[
                { icon: shieldCheckmarkOutline, k: 'verifiedPros', t: 'Verified pros' },
                { icon: peopleOutline, k: 'trades40', t: '40+ trades' },
                { icon: locationOutline, k: 'panIndia', t: 'Pan-India' },
              ].map((x, i) => (
                <span key={x.t} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {i > 0 && <span aria-hidden style={{ width: 1, height: 16, background: 'var(--anrix-border-strong)' }} />}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IonIcon icon={x.icon} style={{ fontSize: 16, color: 'var(--anrix-primary)' }} /> {t(`auth.hdr_${x.k}`, x.t)}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* ---- Form ---- */}
          {/* `layout` animates the card's height smoothly when the shorter login form
              swaps in for the taller signup form (and back), instead of snapping. */}
          <motion.div layout transition={{ layout: { duration: 0.34, ease: [0.32, 0.72, 0, 1] } }}
            style={{ position: 'relative', width: '100%', maxWidth: 440, margin: '0 auto', padding: 20, overflow: 'hidden',
            background: 'var(--anrix-surface)', border: '1px solid #efe6d3',
            borderRadius: 'var(--anrix-radius-xl)',
            boxShadow: '0 20px 48px rgba(120, 88, 12, 0.13), 0 2px 6px rgba(20, 23, 28, 0.05)' }}>
            {/* Amber signature strip — ties the card to the brand action below */}
            <div aria-hidden style={{ height: 4, margin: '-20px -20px 18px', background: 'linear-gradient(90deg, #f5b301, #ffcb3d)' }} />
            {/* Login / Sign up toggle — active tab is a white pill with an amber border */}
            <div style={{ display: 'flex', gap: 6, padding: 5, borderRadius: 14, background: 'var(--anrix-surface-2)', marginBottom: 14 }}>
              {(['signup', 'login'] as const).map((m) => {
                const on = mode === m;
                return (
                  <button key={m} onClick={() => switchMode(m)}
                    style={{ flex: 1, height: 46, borderRadius: 11, cursor: 'pointer', fontSize: 15, fontWeight: 800,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      border: on ? '1.5px solid var(--anrix-primary)' : '1.5px solid transparent',
                      background: on ? 'var(--anrix-surface)' : 'transparent',
                      color: on ? 'var(--anrix-text-strong)' : 'var(--anrix-text-muted)',
                      boxShadow: on ? '0 4px 10px rgba(245,179,1,0.18)' : 'none', transition: 'all var(--anrix-motion-fast)' }}>
                    <IonIcon icon={m === 'login' ? lockClosedOutline : personOutline}
                      style={{ fontSize: 17, color: on ? 'var(--anrix-primary)' : 'var(--anrix-text-muted)' }} />
                    {m === 'login' ? t('auth.logIn', 'Log in') : t('auth.signUp', 'Sign up')}
                  </button>
                );
              })}
            </div>

            <p style={{ margin: '0 0 14px', fontSize: 13.5, fontWeight: 500, color: 'var(--anrix-text)' }}>
              {mode === 'signup' ? t('auth.signupPrompt', 'Set up your profile — it only takes a minute.') : t('auth.loginPrompt', 'Enter your details to continue')}
            </p>

            {/* popLayout pops the exiting form out of flow so the incoming form defines
                the new height immediately, letting the card's `layout` animate the height
                while the two forms crossfade — no snap, no overlap. */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={mode} layout
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}>
                {mode === 'signup' && (
                  <Field icon={personOutline} focused={focus === 'name'}>
                    <input value={name} placeholder={t('auth.fullName', 'Full name')} onFocus={() => setFocus('name')} onBlur={() => setFocus(null)}
                      onChange={(e) => setName(e.target.value)} style={inputStyle} />
                  </Field>
                )}

                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <button style={ccBox}><span style={{ fontSize: 20, lineHeight: 1 }}>🇮🇳</span> <IonIcon icon={chevronDown} style={{ fontSize: 13, color: 'var(--anrix-text-muted)' }} /></button>
                  <Field focused={focus === 'phone'} noMargin>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--anrix-text-strong)' }}>+91</span>
                    <span style={{ width: 1, height: 24, background: 'var(--anrix-border)', flexShrink: 0 }} />
                    <input inputMode="numeric" maxLength={10} value={phone} placeholder={t('auth.mobileNumber', 'Mobile number')} onFocus={() => setFocus('phone')} onBlur={() => setFocus(null)}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} style={inputStyle} />
                  </Field>
                </div>

                <Field icon={lockClosedOutline} focused={focus === 'pw'}>
                  <input type={showPw ? 'text' : 'password'} value={password} placeholder={mode === 'signup' ? t('auth.createPassword', 'Create password (min 6)') : t('auth.password', 'Password')}
                    onFocus={() => setFocus('pw')} onBlur={() => setFocus(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && mode === 'login') void submit(); }}
                    onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
                  <button onClick={() => setShowPw((s) => !s)} aria-label="Toggle password" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <IonIcon icon={showPw ? eyeOffOutline : eyeOutline} style={{ fontSize: 19, color: 'var(--anrix-text-muted)' }} />
                  </button>
                </Field>

                {/* Remember me + Forgot password — login only */}
                {mode === 'login' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 2px 16px' }}>
                    <button type="button" onClick={() => { setRemember((r) => !r); void haptic.light(); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'grid', placeItems: 'center',
                        border: remember ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border-strong)',
                        background: remember ? 'var(--anrix-primary)' : 'transparent', transition: 'all var(--anrix-motion-fast)' }}>
                        {remember && <IonIcon icon={checkmark} style={{ fontSize: 14, color: 'var(--anrix-on-primary)' }} />}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--anrix-text)' }}>{t('auth.rememberMe', 'Remember me')}</span>
                    </button>
                    <button type="button" onClick={() => setInfo(t('auth.resetPasswordInfo', 'Reset your password from the mobile app or contact support.'))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13.5, fontWeight: 700, color: '#3b6fe0' }}>
                      {t('auth.forgotPassword', 'Forgot password?')}
                    </button>
                  </div>
                )}

                {/* Role — a single searchable bottom sheet listing every role (grouped
                    by category). Native <select> popups overlap the form, so we open a
                    proper panel. Only for signup. */}
                {mode === 'signup' && (
                  <>
                    <label style={fieldLabel}>{t('auth.yourRole', 'Your role')}</label>
                    <SheetSelect icon={constructOutline} placeholder={t('auth.selectYourRolePlaceholder', 'Select your role…')} title={t('auth.selectYourRole', 'Select your role')} searchable value={selectedRole}
                      options={ROLE_OPTIONS} onChange={(v) => pickRole(v as Role)} />
                  </>
                )}

                <button onClick={() => void submit()} disabled={!canSubmit || loading} style={{ ...cta(canSubmit && !loading), marginTop: 6 }}>
                  {loading ? t('auth.pleaseWait', 'Please wait…') : (
                    <>
                      {mode === 'signup' ? t('auth.createAccount', 'Create account') : t('auth.logIn', 'Log in')}
                      <IonIcon icon={arrowForward} style={{ fontSize: 19 }} />
                    </>
                  )}
                </button>

                {!canSubmit && !loading && disabledReason && (
                  <p style={{ textAlign: 'center', color: 'var(--anrix-text-muted)', fontSize: 12.5, fontWeight: 600, margin: '10px 0 0' }}>
                    {disabledReason}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>

            {info && <p style={{ textAlign: 'center', color: 'var(--anrix-success)', fontSize: 12.5, fontWeight: 600, margin: '16px 0 0' }}>{info}</p>}
            {error && <p style={{ textAlign: 'center', color: 'var(--anrix-danger)', fontSize: 12.5, fontWeight: 600, margin: '16px 0 0' }}>{error}</p>}

            {/* Terms — shown on both signup and login (shared card footer) */}
            <p style={{ margin: '14px 0 0', textAlign: 'center', color: 'var(--anrix-text-muted)', fontSize: 12.5, lineHeight: 1.55 }}>
              {t('auth.byContinuing', "By continuing you agree to {{brand}}'s", { brand: BRAND.name })}{' '}
              <a style={termLink}>{t('auth.terms', 'Terms')}</a>, <a style={termLink}>{t('auth.privacy', 'Privacy')}</a> &amp; <a style={termLink}>{t('auth.contentPolicy', 'Content Policy')}</a>
            </p>
          </motion.div>

          {/* Fixed gap — trust strip sits just below the card (no stretched empty space) */}
          <div aria-hidden style={{ height: 26 }} />

          {/* Reassurance strip below the card — 100% Verified · Trusted Community · Secure & Reliable */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '0 auto', width: '100%', maxWidth: 440 }}>
            {[
              { icon: shieldCheckmarkOutline, k: 'verified100', t: '100% Verified' },
              { icon: peopleOutline, k: 'trustedCommunity', t: 'Trusted Community' },
              { icon: lockClosedOutline, k: 'secureReliable', t: 'Secure & Reliable' },
            ].map((x, i) => (
              <div key={x.t} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {i > 0 && <span aria-hidden style={{ width: 1, height: 14, background: 'var(--anrix-border-strong)' }} />}
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <IonIcon icon={x.icon} style={{ fontSize: 16, color: 'var(--anrix-primary-strong)' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--anrix-text)' }}>{t(`auth.trust_${x.k}`, x.t)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

function Field({ icon, focused, noMargin, children }: { icon?: string; focused?: boolean; noMargin?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ ...fieldBox, marginBottom: noMargin ? 0 : 12, flex: noMargin ? 1 : undefined, minWidth: noMargin ? 0 : undefined,
      borderColor: focused ? 'var(--anrix-primary)' : '#e5e7eb', background: 'var(--anrix-surface)',
      boxShadow: focused ? 'var(--anrix-ring-primary)' : 'none' }}>
      {icon && <IonIcon icon={icon} style={{ fontSize: 19, color: 'var(--anrix-text-muted)', flexShrink: 0 }} />}
      {children}
    </div>
  );
}

type Opt = { value: string; label: string; emoji?: string; img?: string; group?: string };

/** Photo thumbnail on a gold + emoji tile. The emoji tile always sits underneath, so
 *  a remote photo that's still loading or fails to load never shows as a blank square —
 *  the role's emoji stays visible until (and unless) the photo paints over it. */
function Thumb({ img, emoji, size = 40 }: { img?: string; emoji?: string; size?: number }) {
  const [ok, setOk] = useState(true);
  return (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
      display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #f3e6c4, #e7d3a6)', fontSize: size * 0.5 }}>
      {emoji || '🛠️'}
      {img && ok && (
        <img src={img} alt="" loading="lazy" onError={() => setOk(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  );
}

/** A field-styled trigger that opens a bottom sheet to pick an option (white + gold).
 *  A sheet — not an inline popover — so the list can never overlap the form fields,
 *  and long lists (roles) get a search box. */
function SheetSelect({ icon, placeholder, title, value, options, onChange, searchable }: {
  icon: string; placeholder: string; title: string; value: string | null; options: Opt[]; onChange: (v: string) => void; searchable?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = options.find((o) => o.value === value);
  const needle = q.trim().toLowerCase();
  // Prefer role-name matches; only fall back to category-name matches when nothing
  // matched by name — so "bui" finds the Builder role, not the whole "Builder /
  // Contractor" category, while "vendor" still surfaces every vendor role.
  const byLabel = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  const list = !searchable || !needle
    ? options
    : byLabel.length > 0
      ? byLabel
      : options.filter((o) => o.group?.toLowerCase().includes(needle));
  const close = () => { setOpen(false); setQ(''); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        style={{ ...fieldBox, width: '100%', marginBottom: 12, cursor: 'pointer' }}>
        {current?.img
          ? <Thumb img={current.img} emoji={current.emoji} size={32} />
          : <span style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'var(--anrix-primary-soft)' }}>
              <IonIcon icon={icon} style={{ fontSize: 18, color: 'var(--anrix-primary-strong)' }} />
            </span>}
        <span style={{ flex: 1, textAlign: 'left', fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: current ? 'var(--anrix-text-strong)' : 'var(--anrix-text-muted)' }}>
          {current ? current.label : placeholder}
        </span>
        <IonIcon icon={chevronDown} style={{ fontSize: 16, color: 'var(--anrix-text-muted)', flexShrink: 0 }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={close}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,18,12,0.45)', display: 'flex', alignItems: 'flex-end' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxHeight: '74vh', background: 'var(--anrix-surface)', borderRadius: '22px 22px 0 0',
                display: 'flex', flexDirection: 'column', boxShadow: '0 -14px 40px rgba(0,0,0,0.22)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div style={{ padding: '12px 20px 6px' }}>
                <div style={{ width: 42, height: 4, borderRadius: 4, background: 'var(--anrix-border)', margin: '0 auto 14px' }} />
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{title}</div>
              </div>

              {searchable && (
                <div style={{ padding: '6px 16px 8px' }}>
                  <div style={{ ...fieldBox, height: 46 }}>
                    <IonIcon icon={searchOutline} style={{ fontSize: 18, color: 'var(--anrix-text-muted)', flexShrink: 0 }} />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('auth.searchRoles', 'Search roles…')} autoFocus style={inputStyle} />
                  </div>
                </div>
              )}

              <div style={{ overflowY: 'auto', padding: '4px 12px 12px' }}>
                {list.map((o, i) => {
                  const sel = o.value === value;
                  // Category header — shown the first time a new group appears (skipped
                  // while searching, since results cut across categories).
                  const showGroup = !needle && o.group && o.group !== list[i - 1]?.group;
                  return (
                    <div key={o.value}>
                      {showGroup && (
                        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                          color: 'var(--anrix-primary-strong)', padding: i === 0 ? '4px 12px 6px' : '14px 12px 6px' }}>
                          {o.group}
                        </div>
                      )}
                      <button type="button" onClick={() => { onChange(o.value); close(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                          padding: '9px 12px', border: 'none', borderRadius: 12, cursor: 'pointer',
                          background: sel ? 'var(--anrix-primary-soft)' : 'transparent',
                          color: sel ? 'var(--anrix-primary)' : 'var(--anrix-text-strong)', fontSize: 15.5, fontWeight: sel ? 800 : 600 }}>
                        {(o.img || o.emoji) && <Thumb img={o.img} emoji={o.emoji} />}
                        <span style={{ flex: 1 }}>{o.label}</span>
                        {sel && <IonIcon icon={checkmark} style={{ fontSize: 18, flexShrink: 0 }} />}
                      </button>
                    </div>
                  );
                })}
                {list.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--anrix-text-muted)', fontSize: 14, padding: '28px 0' }}>{t('auth.noMatches', 'No matches')}</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Small circular back button pinned to the top-left, clear of the safe-area inset.
const backBtn: React.CSSProperties = {
  position: 'absolute', top: 'calc(env(safe-area-inset-top) + 14px)', left: 16, zIndex: 5,
  width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', cursor: 'pointer',
  border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)',
  boxShadow: 'var(--anrix-shadow-1)',
};
const fieldBox: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', height: 54, borderRadius: 14,
  border: '1.5px solid #e5e7eb', background: 'var(--anrix-surface)', transition: 'all var(--anrix-motion-fast)',
};
const ccBox: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, padding: '0 14px', height: 54, borderRadius: 14,
  border: '1.5px solid #e5e7eb', background: 'var(--anrix-surface)', fontSize: 18, cursor: 'pointer', flexShrink: 0,
};
const inputStyle: React.CSSProperties = {
  flex: 1, width: '100%', minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
  fontSize: 16, fontWeight: 600, color: 'var(--anrix-text-strong)', letterSpacing: '0.01em', padding: 0,
};
const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--anrix-primary-strong)',
  textTransform: 'uppercase', margin: '6px 2px 7px', letterSpacing: '0.06em',
};
// Amber, underlined links in the "By continuing…" terms line (signup + login).
const termLink: React.CSSProperties = {
  color: 'var(--anrix-primary-strong)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer',
};
const cta = (active: boolean): React.CSSProperties => ({
  width: '100%', height: 54, border: 'none', borderRadius: 16, marginTop: 2,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  background: 'linear-gradient(180deg, #f7bd1a 0%, #f5b301 100%)',
  color: 'var(--anrix-on-primary)', fontSize: 16.5, fontWeight: 800, opacity: active ? 1 : 0.5,
  cursor: active ? 'pointer' : 'not-allowed', transition: 'all var(--anrix-motion-fast)',
  boxShadow: active ? '0 10px 24px rgba(245, 179, 1, 0.38)' : 'none',
});
