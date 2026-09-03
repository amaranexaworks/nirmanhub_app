import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IonIcon,
  useIonRouter,
} from '@ionic/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  walletOutline,
  shieldCheckmarkOutline,
  starOutline,
  bookmarkOutline,
  settingsOutline,
  helpCircleOutline,
  giftOutline,
  logOutOutline,
  chevronForward,
  briefcaseOutline,
  createOutline,
  sparklesOutline,
  documentTextOutline,
  timeOutline,
  addOutline,
} from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Reveal } from '@components/motion';
import { Avatar, Badge, RatingStars } from '@design/primitives';
import { useAuthStore } from '@stores/authStore';
import { walletApi } from '@services/api/walletApi';
import { ROLE_CATALOG } from '@models/roles';

/** Quick-action tiles — each carries its own professional tone (distinct, calm colour). */
const QUICK_ACTIONS = [
  { icon: documentTextOutline, key: 'myPosts', label: 'My Posts', sub: 'Requirements & replies', go: '/app/my-posts', tone: 'blue' },
  { icon: timeOutline, key: 'history', label: 'History', sub: 'Orders & activity', go: '/app/history', tone: 'violet' },
  { icon: bookmarkOutline, key: 'saved', label: 'Saved', sub: 'Shortlists & searches', go: '/app/saved', tone: 'teal' },
] as const;

export function ProfilePage() {
  const { t } = useTranslation();
  const history = useHistory();
  const router = useIonRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const walletBalance = useQuery({ queryKey: ['wallet', 'balance'], queryFn: () => walletApi.balance() });

  if (!user) return null;

  const doLogout = () => {
    logout();
    // Root-level transition so it escapes the tabs outlet (plain history.replace doesn't).
    router.push('/auth/login', 'root', 'replace');
  };

  const accountRows = [
    { icon: sparklesOutline, label: 'Nirmanam Pro', sub: t('profile.planSubscriptionBilling', 'Plan, subscription & billing'), go: '/app/plans' },
    { icon: starOutline, label: t('profile.reviewsRatings', 'Reviews & Ratings'), sub: t('profile.whatClientsSay', 'What clients say about you'), go: '/app/my-posts' },
    { icon: giftOutline, label: t('profile.referEarn', 'Refer & Earn'), sub: t('profile.inviteEarnRewards', 'Invite & earn rewards'), go: '/app/refer' },
    { icon: briefcaseOutline, label: t('profile.addAnotherRole', 'Add another role'), sub: t('profile.sellHireLend', 'Sell, hire, lend & more'), go: '/onboarding' },
  ];
  const supportRows = [
    { icon: helpCircleOutline, label: t('profile.helpSupport', 'Help & Support'), go: '/app/help' },
    { icon: settingsOutline, label: t('profile.settings', 'Settings'), go: '/app/settings' },
  ];

  return (
    <PageShell title={t('profile.profile', 'Profile')}>
      <AnimatedPage>
        {/* Hero — clean white identity card, amber accents */}
        <Reveal>
          <div
            style={{
              margin: 16,
              borderRadius: 'var(--anrix-radius-xl)',
              padding: 18,
              background: 'var(--anrix-surface)',
              border: '1px solid var(--anrix-border-strong)',
              boxShadow: 'var(--anrix-shadow-2)',
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <Avatar name={user.name} size={64} verified={user.kycTier === 'verified'} online />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--anrix-text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                  <button onClick={() => history.push('/app/profile/edit')} aria-label={t('profile.editProfile', 'Edit profile')}
                    style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, border: '1px solid var(--anrix-primary)', background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                    <IonIcon icon={createOutline} /> {t('profile.edit', 'Edit')}
                  </button>
                </div>
                <div style={{ color: 'var(--anrix-text-muted)', fontSize: 13, marginTop: 3 }}>{user.phone || user.email}</div>
                <div style={{ marginTop: 8 }}>
                  <RatingStars value={user.rating || 0} count={user.ratingCount} size={13} />
                </div>
              </div>
            </div>

            {/* hairline divider before the roles row */}
            <div style={{ height: 1, background: 'var(--anrix-border)', margin: '15px 0 14px' }} />

            {/* Roles — active role highlighted in amber, others neutral */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[...user.roles].sort((a) => (a === user.activeRole ? -1 : 1)).map((r) => {
                const active = r === user.activeRole;
                return (
                  <span key={r} style={active ? activeChip : chip}>
                    <span style={{ fontSize: 13 }}>{ROLE_CATALOG[r].emoji}</span> {ROLE_CATALOG[r].label}
                  </span>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Quick actions — three colourful, framed tiles */}
        <Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '0 16px' }}>
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => history.push(a.go)}
                className="anrix-pressable"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px',
                  borderRadius: 'var(--anrix-radius-lg)', border: '1px solid var(--anrix-border-strong)',
                  background: 'var(--anrix-surface)', boxShadow: 'var(--anrix-shadow-1)', cursor: 'pointer', textAlign: 'center',
                }}
              >
                <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: `var(--anrix-tone-${a.tone}-bg)`, border: `1px solid var(--anrix-tone-${a.tone}-line)` }}>
                  <IonIcon icon={a.icon} style={{ fontSize: 21, color: `var(--anrix-tone-${a.tone}-fg)` }} />
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--anrix-text-strong)' }}>{t(`profile.${a.key}`, a.label)}</span>
              </button>
            ))}
          </div>
        </Reveal>

        {/* Wallet — soft-amber card with live balance */}
        <Reveal>
          <button
            onClick={() => history.push('/app/wallet')}
            className="anrix-pressable"
            style={{
              display: 'block', width: 'calc(100% - 32px)', margin: '16px 16px 0', textAlign: 'left',
              borderRadius: 'var(--anrix-radius-lg)', border: '1px solid var(--anrix-primary)',
              background: 'var(--anrix-primary-soft)', padding: 16, cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: 'var(--anrix-primary)', flexShrink: 0 }}>
                <IonIcon icon={walletOutline} style={{ fontSize: 22, color: 'var(--anrix-on-primary)' }} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{t('profile.walletPayments', 'Wallet & Payments')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--anrix-text-muted)' }}>{t('profile.escrowPayoutsBalance', 'Escrow · payouts · balance')}</div>
              </div>
              <IonIcon icon={chevronForward} style={{ color: 'var(--anrix-primary-strong)', fontSize: 18 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--anrix-primary)' }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--anrix-primary-strong)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('profile.availableBalance', 'Available balance')}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--anrix-text-strong)', marginTop: 2 }}>
                  ₹{(walletBalance.data ?? 0).toLocaleString('en-IN')}
                </div>
              </div>
              <span
                onClick={(e) => { e.stopPropagation(); history.push('/app/wallet'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 16px', borderRadius: 999, background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontSize: 13.5, fontWeight: 800 }}
              >
                <IonIcon icon={addOutline} /> {t('profile.addMoney', 'Add money')}
              </span>
            </div>
          </button>
        </Reveal>

        {/* KYC nudge */}
        {user.kycTier !== 'verified' && (
          <Reveal>
            <div className="anrix-card anrix-pressable" onClick={() => history.push('/app/kyc')}
              style={{ margin: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderColor: 'var(--anrix-warning)' }}>
              <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: 26, color: 'var(--anrix-warning)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{t('profile.verifyYourIdentity', 'Verify your identity')}</div>
                <div className="anrix-muted" style={{ fontSize: 13 }}>{t('profile.submitDocsUnlock', 'Submit documents → unlock payouts, escrow & trust badge')}</div>
              </div>
              <Badge tone="warning">{t('profile.start', 'Start')}</Badge>
            </div>
          </Reveal>
        )}
        {user.kycTier === 'verified' && (
          <Reveal>
            <div className="anrix-card" style={{ margin: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12, borderColor: 'var(--anrix-success)' }}>
              <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: 26, color: 'var(--anrix-success)' }} />
              <div style={{ flex: 1, fontWeight: 700 }}>{t('profile.identityVerified', 'Identity verified')}</div>
              <Badge tone="success">{t('profile.verified', 'Verified')}</Badge>
            </div>
          </Reveal>
        )}

        {/* Account + support — one continuous stack of framed rows */}
        <Reveal>
          <div style={{ ...rowStack, marginTop: 12 }}>
            {accountRows.map((r) => (
              <RowCard key={r.label} icon={r.icon} label={r.label} sub={r.sub} onClick={() => history.push(r.go)} />
            ))}
            {supportRows.map((r) => (
              <RowCard key={r.label} icon={r.icon} label={r.label} onClick={() => history.push(r.go)} />
            ))}
            <RowCard icon={logOutOutline} label={t('profile.logOut', 'Log out')} danger onClick={() => setConfirmLogout(true)} />
          </div>
          <div style={{ height: 'calc(24px + env(safe-area-inset-bottom))' }} />
        </Reveal>
      </AnimatedPage>

      <AnimatePresence>
        {confirmLogout && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
            onClick={() => setConfirmLogout(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,18,12,0.5)', backdropFilter: 'blur(2px)',
              display: 'grid', placeItems: 'center', padding: 24 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog" aria-modal="true" aria-labelledby="logout-title"
              style={{ width: '100%', maxWidth: 340, background: 'var(--anrix-surface)', borderRadius: 22, padding: 24,
                textAlign: 'center', boxShadow: '0 24px 60px rgba(20,18,12,0.28)', border: '1px solid var(--anrix-border)' }}
            >
              <span style={{ display: 'grid', placeItems: 'center', width: 60, height: 60, margin: '0 auto 16px', borderRadius: 18,
                background: 'var(--anrix-danger-soft, rgba(220,38,38,0.10))' }}>
                <IonIcon icon={logOutOutline} style={{ fontSize: 28, color: 'var(--anrix-danger)' }} />
              </span>
              <h2 id="logout-title" style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>
                {t('profile.logOutQuestion', 'Log out?')}
              </h2>
              <p style={{ margin: '0 0 22px', fontSize: 14, lineHeight: 1.5, color: 'var(--anrix-text-muted)' }}>
                {t('profile.logOutMessage', "You'll return to the login screen. Your data is saved.")}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmLogout(false)} style={modalCancelBtn}>
                  {t('profile.cancel', 'Cancel')}
                </button>
                <button onClick={() => { setConfirmLogout(false); doLogout(); }} style={modalLogoutBtn}>
                  <IonIcon icon={logOutOutline} style={{ fontSize: 18 }} /> {t('profile.logOut', 'Log out')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

/** A single professional menu row rendered as its own framed card — a soft tinted
 *  icon chip, label (+ optional sub), and a trailing chevron (or a custom control).
 *  Amber by default; `danger` recolours the chip/label red for destructive rows. */
function RowCard({ icon, label, sub, onClick, danger, trailing }: {
  icon: string; label: string; sub?: string; onClick?: () => void; danger?: boolean; trailing?: React.ReactNode;
}) {
  const fg = danger ? 'var(--anrix-danger)' : 'var(--anrix-primary-strong)';
  const chipBg = danger ? 'var(--anrix-danger-soft, rgba(220,38,38,0.10))' : 'var(--anrix-primary-soft)';
  return (
    <button onClick={onClick} className="anrix-pressable" style={rowCard}>
      <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: chipBg }}>
        <IonIcon icon={icon} style={{ fontSize: 21, color: fg }} />
      </span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: danger ? 'var(--anrix-danger)' : 'var(--anrix-text-strong)' }}>{label}</div>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--anrix-text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      {trailing ?? <IonIcon icon={chevronForward} style={{ fontSize: 18, color: 'var(--anrix-text-muted)', flexShrink: 0 }} />}
    </button>
  );
}
const rowStack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px' };
const rowCard: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '13px 14px',
  borderRadius: 'var(--anrix-radius-lg)', border: '1px solid var(--anrix-border-strong)',
  background: 'var(--anrix-surface)', boxShadow: 'var(--anrix-shadow-1)', cursor: 'pointer',
};
const chip: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 12px',
  borderRadius: 999,
  background: 'var(--anrix-surface-2)',
  border: '1px solid var(--anrix-border)',
  color: 'var(--anrix-text)',
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.2,
};
/** the currently-active role reads as a soft-amber pill so it stands out from the rest */
const activeChip: React.CSSProperties = {
  ...chip,
  background: 'var(--anrix-primary-soft)',
  border: '1px solid var(--anrix-primary)',
  color: 'var(--anrix-primary-strong)',
  fontWeight: 700,
};
// Buttons inside the logout confirmation modal — neutral Cancel + solid danger Log out.
const modalCancelBtn: React.CSSProperties = {
  flex: 1, height: 48, borderRadius: 14, cursor: 'pointer',
  border: '1.5px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)',
  color: 'var(--anrix-text-strong)', fontWeight: 700, fontSize: 15,
};
const modalLogoutBtn: React.CSSProperties = {
  flex: 1, height: 48, borderRadius: 14, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  border: 'none', background: 'var(--anrix-danger)', color: '#fff', fontWeight: 800, fontSize: 15,
  boxShadow: '0 8px 20px rgba(220,38,38,0.30)',
};
