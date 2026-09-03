import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonPage, IonContent, IonIcon } from '@ionic/react';
import { motion } from 'framer-motion';
import { arrowForward, shieldCheckmark, shieldCheckmarkOutline, peopleOutline, cubeOutline, briefcaseOutline, lockClosedOutline } from 'ionicons/icons';
import { LogoMark } from '@design/brand/Logo';
import { BRAND } from '@design/brand/brand';
import { useAuthStore } from '@stores/authStore';
import { statsApi } from '@services/api/statsApi';
import authBg from '@assets/auth-bg.png';

// Unified brand amber (matches the logo + login screen) — no separate bronze gold.
const AMBER = '#f5b301';
const AMBER_DEEP = '#9a6a06'; // primary-strong — legible amber text on light surfaces
const AMBER_BRIGHT = '#ffcb3d';
const INK = '#15171c';
const NAVY = '#1f2b45';        // dark heading / "HUB" tone

// What the app is for — the three things a new user can do, shown as structured cards.
const PROPS = [
  { icon: peopleOutline, key: 'hireWorkers', title: 'Hire Workers', desc: 'Find skilled & verified workers', seg: 'workers' },
  { icon: cubeOutline, key: 'buyMaterials', title: 'Buy Materials', desc: 'Get quality materials at best prices', seg: 'materials' },
  { icon: briefcaseOutline, key: 'postJobs', title: 'Post Jobs', desc: 'Post jobs & get the right workers', seg: 'jobs' },
];

// Reassurance strip along the bottom — the promises behind the brand.
const TRUST: { icon: string; key: string; label: string }[] = [
  { icon: shieldCheckmarkOutline, key: 'verified100', label: '100% Verified' },
  { icon: peopleOutline, key: 'trustedCommunity', label: 'Trusted Community' },
  { icon: lockClosedOutline, key: 'secureReliable', label: 'Secure & Reliable' },
];

// A single worker portrait for the hero disc (different from the site-crew shot used before).
const HERO_IMG = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=600&q=80&auto=format&fit=crop';

/** Real construction backdrop (src/assets/auth-bg.png) — the same hazy skyline of
 *  cranes + high-rises used on the login screen, pinned to the top so the golden cranes
 *  frame the brand and the image fades to the warm canvas by the middle of the screen. */
function ConstructionBg() {
  return (
    <img
      src={authBg}
      alt=""
      aria-hidden
      style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto',
        zIndex: 1, pointerEvents: 'none', display: 'block',
        // Feather the bottom edge so the image dissolves into the warm gradient.
        WebkitMaskImage: 'linear-gradient(180deg, #000 78%, transparent 100%)',
        maskImage: 'linear-gradient(180deg, #000 78%, transparent 100%)',
      }}
    />
  );
}

/**
 * Welcome / "Get Started" landing — white + gold. The brand shows, a hero worker
 * sits in a gold-ringed disc, the live trusted-user count builds confidence, and
 * Get Started goes to login/signup. Signed-in users skip straight to the app.
 */
export function SplashScreen() {
  const { t } = useTranslation();
  const history = useHistory();
  const { isAuthenticated, hasOnboarded } = useAuthStore();
  // Real registered-user count for social proof — hidden until it loads (no fake number).
  const [userCount, setUserCount] = useState<number | null>(null);
  const [heroOk, setHeroOk] = useState(true);

  useEffect(() => {
    let alive = true;
    statsApi.userCount().then((n) => { if (alive && n > 0) setUserCount(n); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Returning, signed-in users don't need the welcome — send them in after a brief brand flash.
  useEffect(() => {
    sessionStorage.setItem('nirmaan_splashed', '1');
    if (!isAuthenticated) return;
    const t = setTimeout(() => history.replace(hasOnboarded ? '/app/home' : '/onboarding'), 1800);
    return () => clearTimeout(t);
  }, [isAuthenticated, hasOnboarded, history]);

  // Get Started → the no-login guest storefront (browse first, sign up when you act).
  const getStarted = () => history.push('/browse');

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': '#ffffff' } as React.CSSProperties}>
        <div style={{ position: 'relative', minHeight: '100%', overflow: 'hidden',
          background: 'linear-gradient(180deg, #fdfcf8 0%, #faf6ec 52%, #f6efe1 100%)' }}>

          {/* soft amber glow behind the hero */}
          <motion.div aria-hidden style={{ position: 'absolute', top: '30%', left: '50%', x: '-50%', width: 420, height: 420, borderRadius: '50%', background: 'rgba(245,179,1,0.16)', filter: 'blur(90px)' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.62, 0.4] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />

          {/* real construction backdrop image (cranes + high-rises) — the "construction" signature */}
          <ConstructionBg />

          <div style={{ position: 'relative', zIndex: 2, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: 'calc(4vh + env(safe-area-inset-top)) 24px calc(20px + env(safe-area-inset-bottom))' }}>

            {/* brand — icon on top, wordmark + amber underline below */}
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 16 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <LogoMark size={92} />
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 9, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 31, fontWeight: 900, letterSpacing: '0.05em',
                  background: `linear-gradient(135deg, ${AMBER_BRIGHT} 0%, ${AMBER} 45%, ${AMBER_DEEP} 100%)`,
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{BRAND.mark.toUpperCase()}</span>
                <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '0.14em', color: '#1f3a63' }}>{BRAND.markSub.toUpperCase()}</span>
              </span>
              <span aria-hidden style={{ width: 84, height: 4, borderRadius: 3, marginTop: 4,
                background: `linear-gradient(90deg, ${AMBER_BRIGHT}, ${AMBER}, ${AMBER_DEEP})` }} />
            </motion.div>

            {/* heading + subtitle */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
              style={{ marginTop: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em', color: NAVY, lineHeight: 1.2 }}>
                {t('auth.splashHeading', "India's Construction Network")}
              </div>
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 500, color: 'var(--anrix-text)' }}>
                {t('auth.splashSubtitle', 'Connecting people, projects & possibilities')}
              </div>
            </motion.div>

            {/* hero — worker disc inside a gold ring, encircled by a faint dotted tick-ring */}
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.55, ease: 'easeOut' }}
              style={{ position: 'relative', marginTop: 18, width: 232, height: 232, display: 'grid', placeItems: 'center' }}>
              {/* faint dotted ring that encircles the hero */}
              <svg aria-hidden viewBox="0 0 232 232" style={{ position: 'absolute', width: 232, height: 232 }} fill="none">
                <circle cx="116" cy="116" r="112" stroke={AMBER} strokeOpacity={0.5} strokeWidth="2" strokeLinecap="round"
                  strokeDasharray="1.5 9" />
              </svg>
              <div style={{ position: 'relative', width: 200, height: 200, borderRadius: '50%', overflow: 'hidden',
                border: `3px solid ${AMBER}`, boxShadow: '0 18px 42px rgba(154,106,6,0.24)', background: '#e7d3a6' }}>
                {heroOk ? (
                  <img src={HERO_IMG} alt="Verified professional on Nirmanam" loading="eager" onError={() => setHeroOk(false)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 68 }}>👷🏽‍♂️</div>
                )}
              </div>
            </motion.div>

            {/* Social proof — simple pill with the live registered-user count */}
            {userCount !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 18, alignSelf: 'center',
                  padding: '12px 22px', borderRadius: 999, background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(245,179,1,0.32)' }}>
                <IonIcon icon={shieldCheckmark} style={{ color: AMBER, fontSize: 22, flexShrink: 0 }} />
                <span style={{ fontSize: 14.5 }}>
                  <span style={{ color: INK, fontWeight: 800 }}>{t('auth.trustedBy', 'Trusted by {{n}}+', { n: userCount.toLocaleString('en-IN') })}</span>
                  <span style={{ color: 'var(--anrix-text-muted)', fontWeight: 500 }}> {t('auth.professionalsOnNirmanam', 'professionals on Nirmanam')}</span>
                </span>
              </motion.div>
            )}

            <div style={{ flex: 1, minHeight: 14 }} />

            {/* value props — the three things the app is for, as structured cards */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
              style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 400, marginBottom: 16 }}>
              {PROPS.map((p) => (
                <div key={p.title} onClick={() => history.push(`/browse?seg=${p.seg}`)} className="anrix-pressable" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer',
                  padding: '16px 8px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(245,179,1,0.26)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--anrix-primary-soft)' }}>
                    <IonIcon icon={p.icon} style={{ fontSize: 22, color: AMBER_DEEP }} />
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: INK, textAlign: 'center' }}>{t(`auth.prop_${p.key}_title`, p.title)}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.35, color: 'var(--anrix-text-muted)', textAlign: 'center' }}>{t(`auth.prop_${p.key}_desc`, p.desc)}</span>
                </div>
              ))}
            </motion.div>

            {/* Get Started — amber fill, charcoal label (design-system contrast) */}
            {!isAuthenticated && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}
                style={{ width: '100%', maxWidth: 400 }}>
                <button onClick={getStarted}
                  style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer',
                    background: `linear-gradient(180deg, ${AMBER} 0%, #e3a306 100%)`, color: 'var(--anrix-on-primary)',
                    fontSize: 17, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 12px 28px rgba(227,163,6,0.4)' }}>
                  {t('auth.getStarted', 'Get Started')} <IonIcon icon={arrowForward} style={{ fontSize: 20 }} />
                </button>
              </motion.div>
            )}

            {/* Reassurance strip — 100% Verified · Trusted Community · Secure & Reliable */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16, width: '100%', maxWidth: 400 }}>
              {TRUST.map((item, i) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {i > 0 && <span aria-hidden style={{ width: 1, height: 14, background: 'rgba(0,0,0,0.14)' }} />}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <IonIcon icon={item.icon} style={{ fontSize: 16, color: AMBER_DEEP }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--anrix-text)' }}>{t(`auth.trust_${item.key}`, item.label)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
