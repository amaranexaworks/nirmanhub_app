import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  briefcaseOutline, cashOutline, chatbubbleEllipsesOutline, starOutline, ribbonOutline,
  notificationsOutline, shieldCheckmarkOutline, documentTextOutline, checkmarkDoneOutline,
} from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { notificationsApi } from '@services/api/notificationsApi';

/** Map a notification type code → icon + tone. */
const ICONS: Record<string, { icon: string; tone: string }> = {
  job: { icon: briefcaseOutline, tone: 'var(--anrix-primary)' },
  payment: { icon: cashOutline, tone: 'var(--anrix-success)' },
  message: { icon: chatbubbleEllipsesOutline, tone: 'var(--anrix-info)' },
  booking: { icon: starOutline, tone: 'var(--anrix-warning)' },
  kyc: { icon: shieldCheckmarkOutline, tone: 'var(--anrix-primary)' },
  loan: { icon: documentTextOutline, tone: 'var(--anrix-info)' },
  general: { icon: ribbonOutline, tone: 'var(--anrix-primary)' },
};

function timeAgo(ts: string): string {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return 'now';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export function NotificationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsApi.list() });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const hasUnread = items.some((n: any) => n.read_in === 0);

  return (
    <PageShell title={t('notif.title', 'Notifications')} showBack>
      <AnimatedPage>
        {hasUnread && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px 0' }}>
            <button onClick={() => markAll.mutate()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <IonIcon icon={checkmarkDoneOutline} /> {t('notif.markAllRead', 'Mark all read')}
            </button>
          </div>
        )}

        {isLoading && <BrandLoader />}

        {!isLoading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 56, color: 'var(--anrix-text-muted)' }}>
            <IonIcon icon={notificationsOutline} style={{ fontSize: 40, opacity: 0.4 }} />
            <p style={{ marginTop: 10 }}>{t('notif.allCaughtUp', "You're all caught up.")}</p>
          </div>
        )}

        {items.map((n: any) => {
          const meta = ICONS[n.type_cd] ?? ICONS.general;
          const unread = n.read_in === 0;
          return (
            <div key={n.notfcn_id} onClick={() => unread && markRead.mutate(n.notfcn_id)}
              style={{ display: 'flex', gap: 12, padding: '12px 16px', cursor: unread ? 'pointer' : 'default', background: unread ? 'var(--anrix-primary-soft)' : 'transparent', borderBottom: '1px solid var(--anrix-border)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--anrix-surface-2)' }}>
                <IonIcon icon={meta.icon} style={{ fontSize: 20, color: meta.tone }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5 }}>{n.ttl_tx}</span>
                  <span className="anrix-muted" style={{ fontSize: 12 }}>{timeAgo(n.i_ts)}</span>
                </div>
                {n.body_tx && <div className="anrix-muted" style={{ fontSize: 13.5, marginTop: 2 }}>{n.body_tx}</div>}
              </div>
            </div>
          );
        })}
      </AnimatedPage>
    </PageShell>
  );
}
