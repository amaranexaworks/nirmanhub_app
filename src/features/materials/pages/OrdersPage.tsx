import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery } from '@tanstack/react-query';
import { receiptOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { Segmented } from '@components/data/Segmented';
import { Badge, GradientButton } from '@design/primitives';
import { materialsApi } from '@services/api/materialsApi';

const TONE: Record<string, 'warning' | 'info' | 'success' | 'danger'> = { placed: 'warning', packed: 'info', delivered: 'success', cancelled: 'danger' };

export function OrdersPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const [tab, setTab] = useState<'active' | 'delivered'>('active');
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['materials', 'orders'], queryFn: () => materialsApi.orders() });
  const list = orders.filter((o: any) => (tab === 'delivered' ? o.sts_cd === 'delivered' : o.sts_cd !== 'delivered' && o.sts_cd !== 'cancelled'));

  return (
    <PageShell title={t('mat.orders', 'Orders')}>
      <AnimatedPage>
        <Segmented value={tab} onChange={setTab}
          options={[{ key: 'active', label: t('mat.active', 'Active') }, { key: 'delivered', label: t('mat.delivered', 'Delivered') }]} />

        {isLoading && <BrandLoader />}
        {!isLoading && list.length === 0 && (
          <div style={{ textAlign: 'center', padding: 56, color: 'var(--anrix-text-muted)' }}>
            <IonIcon icon={receiptOutline} style={{ fontSize: 38, opacity: 0.4 }} />
            <p style={{ marginTop: 8 }}>{t('mat.noOrdersYet', 'No {{tab}} orders yet.', { tab })}</p>
            <button onClick={() => history.push('/app/order')} style={{ background: 'none', border: 'none', color: 'var(--anrix-primary-strong)', fontWeight: 700, cursor: 'pointer' }}>{t('mat.orderMaterialsArrow', 'Order materials →')}</button>
          </div>
        )}

        {list.map((o: any) => (
          <div key={o.ordr_id} className="anrix-card" style={{ margin: '0 16px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>{t('mat.orderNumber', 'Order #{{id}}', { id: o.ordr_id })}</span>
              <Badge tone={TONE[o.sts_cd] || 'neutral'}>{o.sts_cd}</Badge>
            </div>
            <div className="anrix-muted" style={{ fontSize: 13, marginTop: 2 }}>
              {o.item_count} item{o.item_count > 1 ? 's' : ''}{o.dlvry_tx ? ` · to ${o.dlvry_tx}` : ''} · {new Date(o.i_ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
              <strong style={{ flex: 1, fontSize: 16 }}>₹{Number(o.ttl_am).toLocaleString('en-IN')}</strong>
              <GradientButton variant="outline" full={false} style={{ width: 150 }} onClick={() => history.push(`/app/order`)}>{t('mat.view', 'View')}</GradientButton>
            </div>
          </div>
        ))}
      </AnimatedPage>
    </PageShell>
  );
}
