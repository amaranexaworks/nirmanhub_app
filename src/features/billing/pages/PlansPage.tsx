import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IonIcon, IonModal, IonToast, IonToggle } from '@ionic/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkmark, checkmarkCircle, closeOutline, shieldCheckmark, sparkles, lockOpen } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { GradientButton, Badge } from '@design/primitives';
import { billingApi } from '@services/api/billingApi';
import { useSubscriptionStore, FREE_LEAD_LIMIT, type Cycle, type Plan } from '../store/subscriptionStore';

const rupee = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmt = (ts?: string) => (ts ? new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined);

export function PlansPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { autoRenew, remaining, setAutoRenew } = useSubscriptionStore();
  const { data: sub } = useQuery({ queryKey: ['billing', 'subscription'], queryFn: () => billingApi.subscription() });
  const { data: plans = [] } = useQuery({ queryKey: ['billing', 'plans'], queryFn: () => billingApi.plans() });

  const plan = (sub?.plan_cd ?? 'free') as Plan;
  const cycle = (sub?.cycle_cd ?? 'monthly') as Cycle;
  const proSince = fmt(sub?.strt_ts);
  const renewsOn = fmt(sub?.end_ts);

  // Pricing & benefits come straight from /billing/plans (no hardcoded values).
  const proRow = (c: Cycle) => plans.find((p: any) => p.plan_cd === 'pro' && p.cycle_cd === c);
  const priceFor = (c: Cycle) => Number(proRow(c)?.price_am ?? 0);
  const perFor = (c: Cycle) => (c === 'yearly' ? '/yr' : '/mo');
  const benefits: string[] = (proRow('monthly')?.benefits_tx ?? '').split('|').map((s: string) => s.trim()).filter(Boolean);
  const yearlyNote = () => {
    const m = priceFor('monthly'), y = priceFor('yearly');
    return m && y && y < m * 12 ? t('billing.saveBilledYearly', 'Save {{amount}} · billed yearly', { amount: rupee(m * 12 - y) }) : undefined;
  };

  const subscribeMut = useMutation({ mutationFn: (c: Cycle) => billingApi.subscribe('pro', c), onSuccess: () => qc.invalidateQueries({ queryKey: ['billing', 'subscription'] }) });
  const cancelMut = useMutation({ mutationFn: () => billingApi.subscribe('free', 'monthly'), onSuccess: () => qc.invalidateQueries({ queryKey: ['billing', 'subscription'] }) });

  const [pick, setPick] = useState<Cycle>(cycle);
  const [pay, setPay] = useState(false);
  const [toast, setToast] = useState('');

  // A clean included-benefits list that lives INSIDE a card (one panel, hairline
  // between rows) — not one card per benefit, which read as clutter.
  const BenefitList = ({ items }: { items: string[] }) => (
    <>
      {items.map((b, i) => (
        <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid var(--anrix-border)' : 'none' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%', background: 'var(--anrix-success)', flexShrink: 0 }}>
            <IonIcon icon={checkmark} style={{ fontSize: 14, color: '#fff' }} />
          </span>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--anrix-text-strong)' }}>{b}</span>
        </div>
      ))}
    </>
  );

  // ---------- Already Pro: manage view ----------
  if (plan === 'pro') {
    return (
      <PageShell title={t('billing.yourPlan', 'Your Plan')} showBack>
        <AnimatedPage>
          <div style={{ padding: 16 }}>
            <div style={{ borderRadius: 'var(--anrix-radius-xl)', padding: 12, background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', border: '1px solid var(--anrix-hero-border)', boxShadow: 'var(--anrix-hero-shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IonIcon icon={shieldCheckmark} style={{ fontSize: 22, color: 'var(--anrix-hero-accent)' }} />
                <span style={{ fontWeight: 800, fontSize: 20 }}>Nirmanam Pro</span>
                <Badge tone="success">{t('billing.active', 'Active')}</Badge>
              </div>
              <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 13.5, marginTop: 8 }}>
                {cycle === 'yearly' ? t('billing.yearly', 'Yearly') : t('billing.monthly', 'Monthly')} · {rupee(priceFor(cycle))}{perFor(cycle)}
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 12, fontSize: 12.5, color: 'var(--anrix-hero-muted)' }}>
                {proSince && <span>{t('billing.since', 'Since {{date}}', { date: proSince })}</span>}
                {renewsOn && <span>{t('billing.renews', 'Renews {{date}}', { date: renewsOn })}</span>}
              </div>
            </div>

            <div className="anrix-card" style={{ marginTop: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{t('billing.autoRenew', 'Auto-renew')}</div>
                <div className="anrix-muted" style={{ fontSize: 12.5 }}>{autoRenew ? t('billing.renewsAutomaticallyOn', 'Renews automatically on {{date}}', { date: renewsOn }) : t('billing.willNotRenew', 'Will not renew — access ends on {{date}}', { date: renewsOn })}</div>
              </div>
              <IonToggle checked={autoRenew} onIonChange={(e) => { setAutoRenew(e.detail.checked); setToast(e.detail.checked ? t('billing.autoRenewOn', 'Auto-renew on') : t('billing.autoRenewOff', 'Auto-renew off')); }} />
            </div>

            <div style={{ fontWeight: 700, margin: '18px 0 8px' }}>{t('billing.yourBenefits', 'Your benefits')}</div>
            <div className="anrix-card" style={{ padding: '4px 16px' }}>
              <BenefitList items={benefits} />
            </div>

            <button onClick={() => { cancelMut.mutate(); setToast(t('billing.subscriptionCancelled', 'Subscription cancelled')); }}
              style={{ width: '100%', marginTop: 16, height: 46, borderRadius: 12, border: '1.5px solid var(--anrix-border-strong)', background: 'transparent', color: 'var(--anrix-danger)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {t('billing.cancelSubscription', 'Cancel subscription')}
            </button>
          </div>
        </AnimatedPage>
        <IonToast isOpen={!!toast} message={toast} duration={1500} onDidDismiss={() => setToast('')} />
      </PageShell>
    );
  }

  // ---------- Free: upsell view ----------
  return (
    <PageShell title={t('billing.goPro', 'Go Pro')} showBack>
      <AnimatedPage>
        <div style={{ padding: 16 }}>
          {/* hero */}
          <div style={{ borderRadius: 'var(--anrix-radius-xl)', padding: 22, background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', border: '1px solid var(--anrix-hero-border)', boxShadow: 'var(--anrix-hero-shadow)', textAlign: 'center' }}>
            <IonIcon icon={sparkles} style={{ fontSize: 30, color: 'var(--anrix-hero-accent)' }} />
            <div style={{ fontWeight: 800, fontSize: 24, marginTop: 6 }}>Nirmanam Pro</div>
            <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 14, marginTop: 4 }}>{t('billing.getUnlimited', 'Get unlimited customers & leads')}</div>
          </div>

          {/* free usage notice */}
          <div className="anrix-card" style={{ marginTop: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <IonIcon icon={lockOpen} style={{ fontSize: 20, color: 'var(--anrix-warning)' }} />
            <div style={{ fontSize: 13, color: 'var(--anrix-text)' }}>
              {t('billing.freePlanLabel', 'Free plan:')} <strong>{t('billing.ofCount', '{{used}} of {{total}}', { used: remaining(), total: FREE_LEAD_LIMIT })}</strong> {t('billing.customerUnlocksLeft', 'customer unlocks left this month.')}
            </div>
          </div>

          {/* cycle toggle */}
          <div style={{ display: 'flex', gap: 8, background: 'var(--anrix-surface-2)', borderRadius: 12, padding: 4, marginTop: 16 }}>
            {(['monthly', 'yearly'] as Cycle[]).map((c) => (
              <button key={c} onClick={() => setPick(c)} style={{
                flex: 1, height: 40, borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13.5,
                background: pick === c ? 'var(--anrix-surface)' : 'transparent', color: pick === c ? 'var(--anrix-text-strong)' : 'var(--anrix-text-muted)',
                boxShadow: pick === c ? 'var(--anrix-shadow-1)' : 'none',
              }}>{c === 'monthly' ? t('billing.monthly', 'Monthly') : t('billing.yearly', 'Yearly')}{c === 'yearly' && <span style={{ marginLeft: 5, fontSize: 11, color: 'var(--anrix-success)' }}>{t('billing.minus2mo', '−2 mo')}</span>}</button>
            ))}
          </div>

          {/* Plan card — price header + what's-included list in one cohesive panel */}
          <div className="anrix-card" style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '22px 18px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 38, fontWeight: 900, color: 'var(--anrix-primary-strong)', lineHeight: 1 }}>
                {rupee(priceFor(pick))}<span style={{ fontSize: 17, color: 'var(--anrix-text-muted)', fontWeight: 600 }}>{perFor(pick)}</span>
              </div>
              <div style={{ marginTop: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--anrix-text-muted)' }}>
                {pick === 'yearly' ? t('billing.billedYearly', 'Billed yearly') : t('billing.billedMonthly', 'Billed monthly')} · {t('billing.cancelAnytime', 'cancel anytime')}
              </div>
              {pick === 'yearly' && yearlyNote() && (
                <div style={{ display: 'inline-block', marginTop: 10, padding: '4px 12px', borderRadius: 999, background: 'var(--anrix-success-soft, rgba(22,163,74,0.10))', color: 'var(--anrix-success)', fontSize: 12.5, fontWeight: 700 }}>
                  {yearlyNote()}
                </div>
              )}
            </div>
            <div style={{ height: 1, background: 'var(--anrix-border)' }} />
            <div style={{ padding: '14px 18px 16px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--anrix-primary-strong)', marginBottom: 4 }}>
                {t('billing.whatsIncluded', "What's included")}
              </div>
              <BenefitList items={benefits} />
            </div>
          </div>
        </div>
      </AnimatedPage>

      {/* sticky subscribe CTA */}
      <div style={{ position: 'sticky', bottom: 0, padding: 16, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: 'var(--anrix-surface)', borderTop: '1px solid var(--anrix-border)' }}>
        <GradientButton icon={shieldCheckmark} onClick={() => setPay(true)}>{t('billing.subscribe', 'Subscribe')} · {rupee(priceFor(pick))}{perFor(pick)}</GradientButton>
      </div>

      {/* UPI Autopay sheet (replace with Razorpay checkout) */}
      <IonModal isOpen={pay} onDidDismiss={() => setPay(false)} initialBreakpoint={0.5} breakpoints={[0, 0.5]}>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setPay(false)} style={{ background: 'var(--anrix-surface-2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><IonIcon icon={closeOutline} style={{ fontSize: 20 }} /></button>
          </div>
          <h2 style={{ margin: '4px 0 4px', fontSize: 20, fontWeight: 800 }}>{t('billing.setUpUpiAutopay', 'Set up UPI Autopay')}</h2>
          <div className="anrix-muted" style={{ fontSize: 13.5, marginBottom: 16 }}>
            {pick === 'yearly'
              ? t('billing.approveAutoDebitYearly', "You'll approve a yearly auto-debit of {{amount}} in your UPI app. Cancel anytime.", { amount: rupee(priceFor(pick)) })
              : t('billing.approveAutoDebitMonthly', "You'll approve a monthly auto-debit of {{amount}} in your UPI app. Cancel anytime.", { amount: rupee(priceFor(pick)) })}
          </div>
          <div className="anrix-card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span>Nirmanam Pro ({pick})</span><strong>{rupee(priceFor(pick))}{perFor(pick)}</strong>
          </div>
          <GradientButton icon={checkmarkCircle} onClick={() => { subscribeMut.mutate(pick); setPay(false); setToast(t('billing.youreOnPro', "You're on Pro 🎉")); }}>
            {t('billing.approveAndSubscribe', 'Approve & Subscribe')}
          </GradientButton>
          <div className="anrix-muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 10 }}>
            {t('billing.paymentAuthenticated', 'Payment authenticated by your UPI app / gateway.')}
          </div>
        </div>
      </IonModal>

      <IonToast isOpen={!!toast} message={toast} duration={1600} onDidDismiss={() => setToast('')} />
    </PageShell>
  );
}
