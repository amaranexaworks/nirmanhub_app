import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IonIcon, useIonAlert, useIonToast } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashOutline, documentTextOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Pressable } from '@components/motion';
import { Badge, GradientButton } from '@design/primitives';
import { Segmented } from '@components/data/Segmented';
import { lendingApi } from '@services/api/lendingApi';

/**
 * Borrower-facing loans. A builder/contractor browses financing products offered on the
 * network and applies (needs the apply_loan capability); the "My applications" tab tracks
 * each request's status. This is distinct from Material Credit (buy-materials-pay-later)
 * and from the lender console (LoanProductsPage / ApplicationsPage).
 */
const STATUS_TONE: Record<string, 'warning' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning', approved: 'success', disbursed: 'success', rejected: 'danger',
};

export function LoansPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'offers' | 'mine'>('offers');
  const [presentAlert] = useIonAlert();
  const [toast] = useIonToast();

  const { data: products = [], isLoading: loadingProducts } = useQuery({ queryKey: ['lending', 'products'], queryFn: () => lendingApi.products() });
  const { data: mine = [], isLoading: loadingMine } = useQuery({ queryKey: ['lending', 'applications'], queryFn: () => lendingApi.myApplications() });

  const apply = useMutation({
    mutationFn: ({ productId, amount, tenure, purpose }: { productId: number | string; amount?: number; tenure?: string; purpose?: string }) =>
      lendingApi.apply(productId, { amount, tenure, purpose }),
    onSuccess: () => {
      void toast({ message: t('loans.applied', 'Application submitted ✓'), duration: 1600, color: 'success', position: 'top' });
      qc.invalidateQueries({ queryKey: ['lending', 'applications'] });
      setTab('mine');
    },
    onError: (e: any) => toast({ message: e.message || t('loans.couldNotApply', 'Could not apply'), duration: 1800, color: 'danger', position: 'top' }),
  });

  const openApply = (p: any) => presentAlert({
    header: t('loans.applyFor', 'Apply · {{name}}', { name: p.nm_tx }),
    message: [p.rate_tx && `${t('loans.rate', 'Rate')}: ${p.rate_tx}`, p.range_tx && `${t('loans.range', 'Range')}: ${p.range_tx}`, p.tenure_tx && `${t('loans.tenure', 'Tenure')}: ${p.tenure_tx}`].filter(Boolean).join('  ·  '),
    inputs: [
      { name: 'amount', type: 'number', placeholder: t('loans.amountHint', 'Amount needed (₹)') },
      { name: 'tenure', placeholder: t('loans.tenureHint', 'Preferred tenure (e.g. 12 mo)') },
      { name: 'purpose', placeholder: t('loans.purposeHint', 'Purpose (e.g. site materials)') },
    ],
    buttons: [
      { text: t('loans.cancel', 'Cancel'), role: 'cancel' },
      { text: t('loans.apply', 'Apply'), handler: (v) => apply.mutate({ productId: p.prdct_id, amount: v.amount ? Number(v.amount) : undefined, tenure: v.tenure || undefined, purpose: v.purpose || undefined }) },
    ],
  });

  return (
    <PageShell title={t('loans.title', 'Loans')} showBack>
      <AnimatedPage>
        <Segmented value={tab} onChange={setTab}
          options={[{ key: 'offers', label: t('loans.offers', 'Offers') }, { key: 'mine', label: t('loans.myApplications', 'My applications') }]} />

        {/* ── Offers: browse financing products and apply ── */}
        {tab === 'offers' && (
          <>
            <p className="anrix-muted" style={{ padding: '4px 20px 8px', fontSize: 14 }}>
              {t('loans.offersIntro', 'Financing from banks and lenders on the network. Apply and track it here.')}
            </p>
            {loadingProducts && <BrandLoader />}
            {!loadingProducts && products.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--anrix-text-muted)' }}>{t('loans.noOffers', 'No loan offers available right now.')}</div>
            )}
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {products.map((p: any) => (
                <div key={p.prdct_id} className="anrix-card">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'var(--anrix-primary-soft)', flexShrink: 0 }}>
                      <IonIcon icon={cashOutline} style={{ fontSize: 22, color: 'var(--anrix-primary-strong)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700 }}>{p.nm_tx}</span>
                      <div className="anrix-muted" style={{ fontSize: 13 }}>{p.for_rle_nm ? t('loans.forRole', 'For {{role}}', { role: p.for_rle_nm }) : t('loans.forEveryone', 'For everyone')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, flexWrap: 'wrap' }}>
                    {p.rate_tx && <span><span className="anrix-muted">{t('loans.rate', 'Rate')} </span><strong>{p.rate_tx}</strong></span>}
                    {p.range_tx && <span><span className="anrix-muted">{t('loans.range', 'Range')} </span><strong>{p.range_tx}</strong></span>}
                    {p.tenure_tx && <span><span className="anrix-muted">{t('loans.tenure', 'Tenure')} </span><strong>{p.tenure_tx}</strong></span>}
                  </div>
                  <GradientButton full style={{ marginTop: 14 }} onClick={() => openApply(p)}>{t('loans.apply', 'Apply')}</GradientButton>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── My applications: track submitted requests ── */}
        {tab === 'mine' && (
          <>
            {loadingMine && <BrandLoader />}
            {!loadingMine && mine.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--anrix-text-muted)' }}>
                <IonIcon icon={documentTextOutline} style={{ fontSize: 32, opacity: 0.5 }} />
                <div style={{ marginTop: 8 }}>{t('loans.noApplications', 'No applications yet — apply from Offers.')}</div>
              </div>
            )}
            <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mine.map((a: any) => (
                <Pressable key={a.aplctn_id}>
                  <div className="anrix-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.product_nm || t('loans.loan', 'Loan')}</span>
                      <Badge tone={STATUS_TONE[a.sts_cd] || 'neutral'}>{a.sts_cd}</Badge>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13, flexWrap: 'wrap' }}>
                      {a.amt_am != null && <span><span className="anrix-muted">{t('loans.amount', 'Amount')} </span><strong>₹{Number(a.amt_am).toLocaleString('en-IN')}</strong></span>}
                      {a.tenure_tx && <span><span className="anrix-muted">{t('loans.tenure', 'Tenure')} </span><strong>{a.tenure_tx}</strong></span>}
                      {a.purpose_tx && <span><span className="anrix-muted">{t('loans.purpose', 'Purpose')} </span><strong>{a.purpose_tx}</strong></span>}
                    </div>
                  </div>
                </Pressable>
              ))}
            </div>
          </>
        )}
      </AnimatedPage>
    </PageShell>
  );
}
