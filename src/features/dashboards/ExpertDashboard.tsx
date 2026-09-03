import { IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@components/layout/PageShell';
import { StatCard, SectionHeader, EmptyState } from '@design/patterns';
import { layersOutline } from 'ionicons/icons';
import { requirementsApi } from '@services/api/requirementsApi';

/** Archetype C dashboard (Architect / Engineer / Interior Designer). */
export function ExpertDashboard() {
  const history = useHistory();
  const { t } = useTranslation();
  const goLeads = () => history.push('/app/leads');

  const { data: leads = [] } = useQuery({ queryKey: ['requirements', 'feed'], queryFn: () => requirementsApi.list({ limit: 20 }) });

  return (
    <PageShell title={t('dash.home', 'Home')}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--anrix-space-3)', padding: 'var(--anrix-space-4) var(--anrix-space-5)' }}>
        <StatCard icon="🎯" label={t('dash.openLeads', 'Open leads')} value={String(leads.length)} tone="blue" />
        <StatCard icon="📝" label={t('dash.withQuotes', 'With quotes')} value={String(leads.filter((l: any) => Number(l.responses) > 0).length)} tone="violet" />
        <StatCard icon="✨" label={t('dash.freshToday', 'Fresh today')} value={String(leads.filter((l: any) => l.postd_ts && Date.parse(l.postd_ts) > Date.now() - 864e5).length)} tone="green" />
      </div>

      <SectionHeader title={t('dash.suggestedRfqs', 'Suggested RFQs')} action={{ label: t('dash.seeAll', 'See all'), onClick: goLeads }} />
      {leads.length === 0 && (
        <EmptyState icon={layersOutline} title={t('dash.noOpenRfqsYet', 'No open RFQs yet')} message={t('dash.newClientRequirements', 'New client requirements matched to your expertise will appear here.')} ctaLabel={t('dash.browseLeads', 'Browse leads')} onCta={goLeads} />
      )}
      {leads.slice(0, 3).map((l: any) => (
        <div key={l.rqrmnt_id} className="anrix-card anrix-pressable" onClick={goLeads} style={{ margin: '0 var(--anrix-space-5) var(--anrix-space-4)' }}>
          <div style={{ fontWeight: 700 }}>{l.ttl_tx}</div>
          <div className="anrix-muted" style={{ fontSize: 13 }}>{[l.lctn_tx, l.bdgt_tx && `Budget ${l.bdgt_tx}`].filter(Boolean).join(' · ') || 'New requirement'}</div>
          <div style={{ marginTop: 10 }}>
            <IonButton size="small" onClick={(e) => { e.stopPropagation(); goLeads(); }}>{t('dash.sendProposal', 'Send proposal')}</IonButton>
          </div>
        </div>
      ))}
    </PageShell>
  );
}
