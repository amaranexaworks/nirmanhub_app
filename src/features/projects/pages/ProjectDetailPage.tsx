import { useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { grid, construct, layers, shieldCheckmark, cart, locationOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { PillTabs, type PillTab } from '@components/data/PillTabs';
import { EmptyState } from '@design/patterns';
import { workforceApi } from '@services/api/workforceApi';

type TabKey = 'breakdown' | 'design' | 'components' | 'permissions' | 'procurement';

const TABS: (PillTab<TabKey> & { tkey: string })[] = [
  { key: 'breakdown', label: 'Scheme-wise Breakdown', tkey: 'proj.schemeWiseBreakdown', icon: grid },
  { key: 'design', label: 'Design Status', tkey: 'proj.designStatus', icon: construct },
  { key: 'components', label: 'Major Components', tkey: 'proj.majorComponents', icon: layers },
  { key: 'permissions', label: 'Permission Status', tkey: 'proj.permissionStatus', icon: shieldCheckmark },
  { key: 'procurement', label: 'Procurement', tkey: 'proj.procurement', icon: cart },
];

/**
 * Project detail — a bordered pill-tab bar over section content. Each section
 * links to the real feature that owns its data (wages, docs, materials, KYC,
 * orders) rather than inventing numbers.
 */
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('breakdown');

  const { data: projects = [] } = useQuery({ queryKey: ['workforce', 'projects'], queryFn: () => workforceApi.projects() });
  const project = (projects as any[]).find((p) => String(p.prjct_id) === String(id));
  const title = project?.nm_tx || t('proj.project', 'Project');
  const location = project?.lctn_lbl;
  const tabs = TABS.map((tb) => ({ ...tb, label: t(tb.tkey, tb.label) }));

  return (
    <PageShell title={title} showBack>
      <AnimatedPage>
        {location && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, margin: '12px 16px 0', fontSize: 13, color: 'var(--anrix-text-muted)' }}>
            <IonIcon icon={locationOutline} style={{ fontSize: 15 }} /> {location}
          </div>
        )}

        <PillTabs tabs={tabs} value={tab} onChange={setTab} />

        <div style={{ padding: '4px 4px 24px' }}>
          {tab === 'breakdown' && (
            <EmptyState
              icon={grid}
              title={t('proj.schemeWiseCostBreakdown', 'Scheme-wise cost breakdown')}
              message={t('proj.schemeWiseCostBreakdownMsg', 'See wages, advances, and expenses split by work scheme for this project.')}
              ctaLabel={t('proj.openWageRegister', 'Open wage register')}
              onCta={() => history.push('/app/wage-register')}
            />
          )}
          {tab === 'design' && (
            <EmptyState
              icon={construct}
              title={t('proj.designDrawingsStatus', 'Design & drawings status')}
              message={t('proj.designDrawingsStatusMsg', 'Track approved drawings and design revisions. Upload plans as documents to keep them in one place.')}
              ctaLabel={t('proj.manageSite', 'Manage site')}
              onCta={() => history.push('/app/workforce')}
            />
          )}
          {tab === 'components' && (
            <EmptyState
              icon={layers}
              title={t('proj.majorComponentsTitle', 'Major components')}
              message={t('proj.majorComponentsMsg', 'Cement, steel, blocks and other key materials for this project — order and track them from the catalog.')}
              ctaLabel={t('proj.browseMaterials', 'Browse materials')}
              onCta={() => history.push('/app/order')}
            />
          )}
          {tab === 'permissions' && (
            <EmptyState
              icon={shieldCheckmark}
              title={t('proj.permissionApprovalStatus', 'Permission & approval status')}
              message={t('proj.permissionApprovalStatusMsg', 'Keep statutory approvals and KYC verification current so work never stalls on paperwork.')}
              ctaLabel={t('proj.verifyDocuments', 'Verify documents')}
              onCta={() => history.push('/app/kyc')}
            />
          )}
          {tab === 'procurement' && (
            <EmptyState
              icon={cart}
              title={t('proj.procurement', 'Procurement')}
              message={t('proj.procurementMsg', 'Purchase orders and material deliveries for this project. Order now or buy on credit.')}
              ctaLabel={t('proj.orderMaterials', 'Order materials')}
              onCta={() => history.push('/app/order')}
            />
          )}
        </div>
      </AnimatedPage>
    </PageShell>
  );
}
