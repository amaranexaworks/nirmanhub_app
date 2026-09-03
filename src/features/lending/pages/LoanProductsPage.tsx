import { useTranslation } from 'react-i18next';
import { IonIcon, useIonAlert, useIonToast } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addOutline, cashOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Pressable } from '@components/motion';
import { Badge, GradientButton } from '@design/primitives';
import { lendingApi } from '@services/api/lendingApi';

export function LoanProductsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [presentAlert] = useIonAlert();
  const [toast] = useIonToast();
  const { data: products = [], isLoading } = useQuery({ queryKey: ['lending', 'products'], queryFn: () => lendingApi.products() });

  const create = useMutation({
    mutationFn: (body: any) => lendingApi.createProduct(body),
    onSuccess: () => { void toast({ message: 'Product created ✓', duration: 1400, color: 'success', position: 'top' }); qc.invalidateQueries({ queryKey: ['lending', 'products'] }); },
    onError: (e: any) => toast({ message: e.message || 'Could not create', duration: 1800, color: 'danger', position: 'top' }),
  });

  const newProduct = () => presentAlert({
    header: t('lend.newLoanProduct', 'New loan product'),
    inputs: [
      { name: 'name', placeholder: t('lend.productName', 'Product name') },
      { name: 'rate', placeholder: t('lend.rateHint', 'Rate (e.g. 14% p.a.)') },
      { name: 'range', placeholder: t('lend.rangeHint', 'Range (e.g. ₹10K – ₹1L)') },
      { name: 'tenure', placeholder: t('lend.tenureHint', 'Tenure (e.g. 3–12 mo)') },
    ],
    buttons: [
      { text: t('lend.cancel', 'Cancel'), role: 'cancel' },
      { text: t('lend.create', 'Create'), handler: (v) => { if (v.name) create.mutate(v); } },
    ],
  });

  return (
    <PageShell title={t('lend.loanProducts', 'Loan Products')} footer={<GradientButton icon={addOutline} onClick={newProduct}>{t('lend.newProduct', 'New Product')}</GradientButton>}>
      <AnimatedPage>
        <p className="anrix-muted" style={{ padding: '4px 20px 8px', fontSize: 14 }}>
          {t('lend.productsIntro', 'Financing products offered to every role on the network.')}
        </p>
        {isLoading && <BrandLoader />}
        {!isLoading && products.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--anrix-text-muted)' }}>{t('lend.noProductsYet', 'No products yet — tap “New Product”.')}</div>}
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {products.map((p: any) => (
            <Pressable key={p.prdct_id}>
              <div className="anrix-card">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'var(--anrix-primary-soft)' }}>
                    <IonIcon icon={cashOutline} style={{ fontSize: 22, color: 'var(--anrix-primary-strong)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700 }}>{p.nm_tx}</span>
                      <Badge tone={p.actv_in === 1 ? 'success' : 'neutral'}>{p.actv_in === 1 ? t('lend.live', 'Live') : t('lend.draft', 'Draft')}</Badge>
                    </div>
                    <div className="anrix-muted" style={{ fontSize: 13 }}>{p.for_rle_nm ? t('lend.forRole', 'For {{role}}', { role: p.for_rle_nm }) : t('lend.forEveryone', 'For everyone')}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, flexWrap: 'wrap' }}>
                  {p.rate_tx && <span><span className="anrix-muted">{t('lend.rate', 'Rate')} </span><strong>{p.rate_tx}</strong></span>}
                  {p.range_tx && <span><span className="anrix-muted">{t('lend.range', 'Range')} </span><strong>{p.range_tx}</strong></span>}
                  {p.tenure_tx && <span><span className="anrix-muted">{t('lend.tenure', 'Tenure')} </span><strong>{p.tenure_tx}</strong></span>}
                </div>
              </div>
            </Pressable>
          ))}
        </div>
      </AnimatedPage>
    </PageShell>
  );
}
