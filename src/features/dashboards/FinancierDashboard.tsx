import { useHistory } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Reveal, AnimatedNumber } from '@components/motion';
import { StatCard, SectionHeader, EmptyState } from '@design/patterns';
import { Avatar, Badge, GradientButton } from '@design/primitives';
import { lendingApi } from '@services/api/lendingApi';
import { walletOutline } from 'ionicons/icons';

/** Archetype F dashboard (Banker / Lender) — all figures derived from live lending data. */
export function FinancierDashboard() {
  const history = useHistory();
  const { t } = useTranslation();
  const goApps = () => history.push('/app/applications');

  const { data: queue = [], isLoading } = useQuery({ queryKey: ['lending', 'review-queue'], queryFn: () => lendingApi.reviewQueue() });
  const { data: products = [] } = useQuery({ queryKey: ['lending', 'products'], queryFn: () => lendingApi.products() });

  const inReview = queue.reduce((sum: number, a: any) => sum + (Number(a.amt_am) || 0), 0);

  return (
    <PageShell title={t('dash.lenderDashboard', 'Lender Dashboard')}>
      <AnimatedPage>
        <Reveal>
          <div style={{ margin: 16, padding: 20, borderRadius: 'var(--anrix-radius-xl)', background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', border: '1px solid var(--anrix-hero-border)', boxShadow: 'var(--anrix-hero-shadow)' }}>
            <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 13 }}>{t('dash.amountAwaitingReview', 'Amount awaiting your review')}</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--anrix-hero-accent)' }}>₹<AnimatedNumber value={inReview} /></div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 13 }}>
              <span style={{ color: 'var(--anrix-hero-muted)' }}>{t('dash.inQueue', 'In queue')} <strong>{queue.length}</strong></span>
              <span style={{ color: 'var(--anrix-hero-muted)' }}>{t('dash.products', 'Products')} <strong>{products.length}</strong></span>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px' }}>
            <StatCard icon="🧾" label={t('dash.toReview', 'To review')} value={String(queue.length)} tone="amber" />
            <StatCard icon="🏦" label={t('dash.loanProducts', 'Loan products')} value={String(products.length)} tone="blue" />
          </div>
        </Reveal>

        <SectionHeader title={t('dash.applicationsToReview', 'Applications to review')} action={{ label: t('dash.seeAll', 'See all'), onClick: goApps }} />
        {!isLoading && queue.length === 0 && (
          <EmptyState icon={walletOutline} title={t('dash.noApplicationsToReview', 'No applications to review')} message={t('dash.newLoanApplications', 'New loan applications from the network will appear here for your decision.')} />
        )}
        {queue.slice(0, 4).map((a: any) => (
          <div key={a.aplctn_id} className="anrix-card" style={{ margin: '0 16px 14px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar name={a.aplcnt_nm || 'Applicant'} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{a.aplcnt_nm || 'Applicant'}</div>
                <div className="anrix-muted" style={{ fontSize: 13 }}>{a.product_nm}{a.purpose_tx ? ` · ${a.purpose_tx}` : ''}</div>
              </div>
              {a.rtng_nm != null && <Badge tone="success">★ {Number(a.rtng_nm).toFixed(1)}</Badge>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
              <strong style={{ flex: 1, fontSize: 16 }}>{a.amt_am != null ? `₹${Number(a.amt_am).toLocaleString('en-IN')}` : '—'}</strong>
              <GradientButton variant="outline" full={false} onClick={goApps} style={{ width: 110, marginRight: 8 }}>{t('dash.reject', 'Reject')}</GradientButton>
              <GradientButton full={false} onClick={goApps} style={{ width: 110 }}>{t('dash.approve', 'Approve')}</GradientButton>
            </div>
          </div>
        ))}
      </AnimatedPage>
    </PageShell>
  );
}
