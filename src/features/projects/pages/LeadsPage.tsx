import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery } from '@tanstack/react-query';
import { locationOutline, cashOutline, timeOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, TiltCard } from '@components/motion';
import { Segmented } from '@components/data/Segmented';
import { Badge, GradientButton } from '@design/primitives';
import { requirementsApi } from '@services/api/requirementsApi';
import { serviceMeta, type ServiceType } from '@features/requirements/store/requirementsStore';

function ago(ts?: string): string {
  if (!ts) return '';
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 3600) return `${Math.max(1, Math.floor(d / 60))}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export function LeadsPage() {
  const history = useHistory();
  const { t } = useTranslation();
  const [tab, setTab] = useState<'matched' | 'invited' | 'proposals'>('matched');

  const matchedQ = useQuery({ queryKey: ['requirements', 'feed'], queryFn: () => requirementsApi.list({ limit: 50 }), enabled: tab === 'matched' });
  const invitedQ = useQuery({ queryKey: ['requirements', 'invited'], queryFn: () => requirementsApi.invited(), enabled: tab === 'invited' });
  const proposalsQ = useQuery({ queryKey: ['requirements', 'my-responses'], queryFn: () => requirementsApi.myResponses(), enabled: tab === 'proposals' });

  const active = tab === 'matched' ? matchedQ : tab === 'invited' ? invitedQ : proposalsQ;
  const rows = (active.data ?? []) as any[];

  const emptyMsg = tab === 'matched'
    ? t('proj.noOpenLeads', 'No open leads right now.')
    : tab === 'invited'
      ? t('proj.noInvites', "You haven't been invited to any requirements yet.")
      : t('proj.noProposals', "You haven't sent any proposals yet.");

  return (
    <PageShell title={t('proj.leadsProjects', 'Leads & Projects')}>
      <AnimatedPage>
        <Segmented value={tab} onChange={setTab}
          options={[{ key: 'matched', label: t('proj.matched', 'Matched') }, { key: 'invited', label: t('proj.invited', 'Invited') }, { key: 'proposals', label: t('proj.myProposals', 'My Proposals') }]} />

        {active.isLoading && <BrandLoader />}
        {!active.isLoading && rows.length === 0 && <div style={{ textAlign: 'center', padding: 56, color: 'var(--anrix-text-muted)' }}>{emptyMsg}</div>}

        {rows.map((l: any) => {
          const m = serviceMeta((l.srvc_type_cd || 'other') as ServiceType);
          return (
            <TiltCard key={`${tab}-${l.rqrmnt_id}`} max={6} className="anrix-card" style={{ margin: '0 16px 10px', padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Badge tone="primary">{m.emoji} {m.label}</Badge>
                  <div style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}>{l.ttl_tx}</div>
                  <div className="anrix-muted" style={{ fontSize: 13 }}>{l.postd_by_nm}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, color: 'var(--anrix-primary-strong)', fontSize: 18 }}>{l.responses}</div>
                  <div className="anrix-muted" style={{ fontSize: 10 }}>{t('proj.quotes', 'quotes')}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {l.bdgt_tx && <Badge tone="success" icon={cashOutline}>{l.bdgt_tx}</Badge>}
                {l.lctn_tx && <Badge tone="info" icon={locationOutline}>{l.lctn_tx}</Badge>}
                <Badge tone="neutral" icon={timeOutline}>{t('proj.timeAgo', '{{time}} ago', { time: ago(l.postd_ts) })}</Badge>
                {/* Invited tab: show the invite. Proposals tab: my quote + accepted state. */}
                {tab === 'invited' && l.invite_sts && <Badge tone="warning">{t('proj.invited', 'Invited')}</Badge>}
                {tab === 'proposals' && l.my_price_tx && <Badge tone="primary">{t('proj.myQuote', 'My quote: {{q}}', { q: l.my_price_tx })}</Badge>}
                {tab === 'proposals' && l.accptd_in === 1 && <Badge tone="success">{t('proj.accepted', 'Accepted')}</Badge>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <GradientButton variant="outline" full style={{ flex: 1 }} onClick={() => history.push('/app/requirements')}>{t('proj.view', 'View')}</GradientButton>
                {tab !== 'proposals' && (
                  <GradientButton full style={{ flex: 2 }} onClick={() => history.push('/app/requirements')}>{t('proj.sendProposal', 'Send Proposal')}</GradientButton>
                )}
              </div>
            </TiltCard>
          );
        })}
      </AnimatedPage>
    </PageShell>
  );
}
