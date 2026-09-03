import { IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@components/layout/PageShell';
import { StatCard, SectionHeader, EmptyState } from '@design/patterns';
import { cubeOutline } from 'ionicons/icons';
import { materialsApi } from '@services/api/materialsApi';
import { requirementsApi } from '@services/api/requirementsApi';

/** Archetype E dashboard (Material / Equipment / Property Seller) — figures from live orders + RFQs. */
export function VendorDashboard() {
  const history = useHistory();
  const { t } = useTranslation();

  const { data: orders = [] } = useQuery({ queryKey: ['materials', 'orders'], queryFn: () => materialsApi.orders() });
  const { data: catalog = [] } = useQuery({ queryKey: ['materials', 'catalog'], queryFn: () => materialsApi.catalog({ limit: 100 }) });
  const { data: rfqs = [] } = useQuery({ queryKey: ['requirements', 'feed'], queryFn: () => requirementsApi.list({ limit: 20 }) });

  const revenue = orders.reduce((s: number, o: any) => s + (Number(o.ttl_am) || 0), 0);
  const revenueLabel = revenue >= 100000 ? `₹${(revenue / 100000).toFixed(1)}L` : `₹${(revenue / 1000).toFixed(0)}K`;

  return (
    <PageShell title={t('dash.storefront', 'Storefront')}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--anrix-space-3)', padding: 'var(--anrix-space-4) var(--anrix-space-5)' }}>
        <StatCard icon="📩" label={t('dash.openRfqs', 'Open RFQs')} value={String(rfqs.length)} tone="blue" />
        <StatCard icon="📦" label={t('dash.orders', 'Orders')} value={String(orders.length)} tone="violet" />
        <StatCard icon="💰" label={t('dash.revenue', 'Revenue')} value={orders.length ? revenueLabel : '₹0'} tone="green" />
      </div>

      <SectionHeader title={t('dash.hotRfqs', 'Hot RFQs')} action={{ label: t('dash.seeAll', 'See all'), onClick: () => history.push('/app/requirements') }} />
      {rfqs.length === 0 && (
        <EmptyState icon={cubeOutline} title={t('dash.noOpenRfqsYet', 'No open RFQs yet')} message={t('dash.buyerRequirementsQuote', 'Buyer requirements you can quote on will show up here.')} ctaLabel={t('dash.browseWorkBoard', 'Browse work board')} onCta={() => history.push('/app/requirements')} />
      )}
      {rfqs.slice(0, 3).map((r: any) => (
        <div key={r.rqrmnt_id} className="anrix-card anrix-pressable" onClick={() => history.push('/app/requirements')} style={{ margin: '0 var(--anrix-space-5) var(--anrix-space-4)' }}>
          <div style={{ fontWeight: 700 }}>{r.ttl_tx}</div>
          <div className="anrix-muted" style={{ fontSize: 13 }}>{[r.lctn_tx, r.bdgt_tx && `Budget ${r.bdgt_tx}`].filter(Boolean).join(' · ') || 'New requirement'}</div>
          <div style={{ marginTop: 10 }}>
            <IonButton size="small" onClick={(e) => { e.stopPropagation(); history.push('/app/requirements'); }}>{t('dash.sendQuote', 'Send quote')}</IonButton>
          </div>
        </div>
      ))}

      <SectionHeader title={t('dash.yourCatalog', 'Your catalog')} action={{ label: t('dash.manage', 'Manage'), onClick: () => history.push('/app/catalog') }} />
      <div className="anrix-card" style={{ margin: '0 var(--anrix-space-5) var(--anrix-space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{catalog.length ? t('dash.nListedItems', '{{count}} listed items', { count: catalog.length }) : t('dash.noItemsListedYet', 'No items listed yet')}</span>
          <IonButton size="small" fill="outline" onClick={() => history.push('/app/catalog')}>{catalog.length ? t('dash.edit', 'Edit') : t('dash.addItems', 'Add items')}</IonButton>
        </div>
      </div>
    </PageShell>
  );
}
