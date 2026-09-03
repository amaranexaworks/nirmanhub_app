import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery } from '@tanstack/react-query';
import { locationOutline, chatbubbleEllipsesOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { Segmented } from '@components/data/Segmented';
import { Avatar, Badge, GradientButton } from '@design/primitives';
import { bookingsApi } from '@services/api/bookingsApi';

const STATUS_TONE = { active: 'warning', upcoming: 'info', completed: 'success' } as const;

export function BookingsPage() {
  const history = useHistory();
  const { t } = useTranslation();
  const [tab, setTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const { data: all = [], isLoading } = useQuery({ queryKey: ['bookings', 'seeker'], queryFn: () => bookingsApi.list({ role: 'seeker' }) });
  const list = all.filter((b: any) => b.sts_cd === tab);
  const tabLabel: Record<'active' | 'upcoming' | 'completed', string> = {
    active: t('bookings.active', 'Active'),
    upcoming: t('bookings.upcoming', 'Upcoming'),
    completed: t('bookings.completed', 'Completed'),
  };

  return (
    <PageShell title={t('bookings.myBookings', 'My Bookings')}>
      <AnimatedPage>
        <Segmented value={tab} onChange={setTab}
          options={[{ key: 'active', label: tabLabel.active }, { key: 'upcoming', label: tabLabel.upcoming }, { key: 'completed', label: tabLabel.completed }]} />

        {isLoading && <BrandLoader />}
        {!isLoading && list.length === 0 && (
          <div style={{ textAlign: 'center', padding: 56, color: 'var(--anrix-text-muted)' }}>{t('bookings.noBookings', 'No {{status}} bookings.', { status: tabLabel[tab].toLowerCase() })}</div>
        )}

        {list.map((b: any) => {
          const when = b.schdl_ts ? new Date(b.schdl_ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
          return (
            <div key={b.bookng_id} className="anrix-card" style={{ margin: '0 16px 10px', padding: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Avatar name={b.other_nm || 'Pro'} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5 }}>{b.srvc_tx || b.srvc_type_nm || 'Service'}</span>
                    <Badge tone={STATUS_TONE[b.sts_cd as keyof typeof STATUS_TONE] || 'neutral'}>{b.sts_cd}</Badge>
                  </div>
                  <div className="anrix-muted" style={{ fontSize: 12.5 }}>{b.other_nm}{b.other_rle ? ` · ${b.other_rle}` : ''}</div>
                  <div className="anrix-muted" style={{ fontSize: 12, marginTop: 1 }}>{when}{b.sts_cd === 'active' ? ` · ${t('bookings.percentDone', '{{pct}}% done', { pct: b.prgrs_pct })}` : ''}</div>
                </div>
              </div>

              {b.sts_cd === 'active' && (
                <div style={{ height: 4, borderRadius: 2, background: 'var(--anrix-surface-2)', overflow: 'hidden', marginTop: 10 }}>
                  <div style={{ width: `${b.prgrs_pct}%`, height: '100%', background: 'var(--anrix-primary)' }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <strong style={{ flex: 1, fontSize: 14 }}>{b.amt_am ? `₹${Number(b.amt_am).toLocaleString('en-IN')}` : ''}</strong>
                <GradientButton variant="outline" full={false} icon={chatbubbleEllipsesOutline} style={{ width: 96, height: 40 }}
                  onClick={() => b.other_usr_id && history.push(`/app/chat/${b.other_usr_id}`)}>{t('bookings.chat', 'Chat')}</GradientButton>
                {b.sts_cd === 'completed'
                  ? <GradientButton full={false} style={{ width: 96, height: 40 }}>{t('bookings.rate', 'Rate')}</GradientButton>
                  : <GradientButton full={false} icon={locationOutline} style={{ width: 96, height: 40 }}>{t('bookings.track', 'Track')}</GradientButton>}
              </div>
            </div>
          );
        })}
      </AnimatedPage>
    </PageShell>
  );
}
