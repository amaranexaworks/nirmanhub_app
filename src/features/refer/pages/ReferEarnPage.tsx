import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { IonIcon, useIonToast } from '@ionic/react';
import { copyOutline, shareSocialOutline, giftOutline, checkmarkCircle } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { useAuthStore } from '@stores/authStore';
import { referralApi } from '@services/api/referralApi';

/** Referral code + live stats come from the backend (falls back to a derived code while loading). */
export function ReferEarnPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [toast] = useIonToast();
  const [copied, setCopied] = useState(false);
  const { data: summary } = useQuery({ queryKey: ['referral', 'summary'], queryFn: referralApi.summary });
  const code = summary?.code ?? ('NIRMANAM' + (user?.phone || '000000').replace(/\D/g, '').slice(-4));
  const link = `https://nirmanamhub.com/r/${code}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { void toast({ message: code, duration: 1500, position: 'top' }); }
  };
  const share = async () => {
    const data = { title: t('refer.shareTitle', 'Join Nirmanam'), text: t('refer.shareText', 'Join me on Nirmanam and get ₹100! Use my code {{code}}.', { code }), url: link };
    if (navigator.share) { try { await navigator.share(data); } catch { /* cancelled */ } }
    else { await copy(); void toast({ message: t('refer.linkCopied', 'Link copied — share it with friends!'), duration: 1600, position: 'top' }); }
  };

  const steps = [
    { n: 1, t: t('refer.step1Title', 'Share your code'), d: t('refer.step1Desc', 'Send your referral code to friends & site contacts.') },
    { n: 2, t: t('refer.step2Title', 'They sign up'), d: t('refer.step2Desc', 'Your friend joins Nirmanam using your code.') },
    { n: 3, t: t('refer.step3Title', 'You both earn'), d: t('refer.step3Desc', 'Get ₹100 in your wallet after their first job or order.') },
  ];

  return (
    <PageShell title={t('refer.title', 'Refer & Earn')} showBack>
      <AnimatedPage>
        <div style={{ margin: 16, borderRadius: 20, padding: 24, textAlign: 'center', color: 'var(--anrix-hero-text)',
          background: 'var(--anrix-hero-bg)', border: '1px solid var(--anrix-hero-border)', boxShadow: 'var(--anrix-hero-shadow)' }}>
          <IonIcon icon={giftOutline} style={{ fontSize: 44, color: 'var(--anrix-hero-accent)' }} />
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>{t('refer.heroTitle', 'Earn ₹100 per friend')}</div>
          <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 13.5, marginTop: 4 }}>{t('refer.heroSubtitle', 'Invite pros, builders & vendors you work with.')}</div>

          <div style={{ marginTop: 18, background: 'var(--anrix-hero-chip)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, textAlign: 'left', fontWeight: 800, letterSpacing: '0.08em', fontSize: 18 }}>{code}</span>
            <button onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', color: 'var(--anrix-ink)', border: 'none', borderRadius: 10, padding: '8px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <IonIcon icon={copied ? checkmarkCircle : copyOutline} /> {copied ? t('refer.copied', 'Copied') : t('refer.copy', 'Copy')}
            </button>
          </div>

          {/* Live referral stats from the backend. */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <div style={{ flex: 1, background: 'var(--anrix-hero-chip)', borderRadius: 12, padding: '10px 8px' }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{summary?.joined ?? 0}</div>
              <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 11.5 }}>{t('refer.joined', 'Friends joined')}</div>
            </div>
            <div style={{ flex: 1, background: 'var(--anrix-hero-chip)', borderRadius: 12, padding: '10px 8px' }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>₹{(summary?.rewardEarned ?? 0).toLocaleString('en-IN')}</div>
              <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 11.5 }}>{t('refer.earned', 'Earned')}</div>
            </div>
          </div>
        </div>

        <button onClick={share} style={{ margin: '0 16px', width: 'calc(100% - 32px)', height: 52, borderRadius: 14, border: 'none',
          background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 700, fontSize: 16, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <IonIcon icon={shareSocialOutline} /> {t('refer.shareInvite', 'Share invite')}
        </button>

        <div style={{ padding: '20px 16px 6px', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--anrix-text-muted)' }}>{t('refer.howItWorks', 'HOW IT WORKS')}</div>
        {steps.map((s) => (
          <div key={s.n} style={{ display: 'flex', gap: 14, padding: '10px 16px' }}>
            <div style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', display: 'grid', placeItems: 'center', fontWeight: 800, flexShrink: 0 }}>{s.n}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{s.t}</div>
              <div className="anrix-muted" style={{ fontSize: 13 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </AnimatedPage>
    </PageShell>
  );
}
