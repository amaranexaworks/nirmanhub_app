import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery } from '@tanstack/react-query';
import { checkmarkDone, micOutline, chatbubblesOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Pressable } from '@components/motion';
import { Avatar } from '@design/primitives';
import { messagingApi } from '@services/api/messagingApi';

function timeAgo(ts?: string): string {
  if (!ts) return '';
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return 'now';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export function MessagesPage() {
  const history = useHistory();
  const { t } = useTranslation();
  const { data: threads = [], isLoading } = useQuery({ queryKey: ['messaging', 'threads'], queryFn: () => messagingApi.threads(), refetchInterval: 8000 });

  return (
    <PageShell title={t('msg.messages', 'Messages')}>
      <AnimatedPage>
        {isLoading && <BrandLoader />}
        {!isLoading && threads.length === 0 && (
          <div style={{ textAlign: 'center', padding: 56, color: 'var(--anrix-text-muted)' }}>
            <IonIcon icon={chatbubblesOutline} style={{ fontSize: 40, opacity: 0.4 }} />
            <p style={{ marginTop: 10 }}>{t('msg.noConversations', 'No conversations yet.')}</p>
          </div>
        )}
        {threads.map((thread: any) => (
          <Pressable key={thread.thrd_id} onPress={() => history.push(`/app/chat/${thread.other_usr_id}`)}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--anrix-border)' }}>
              <Avatar name={thread.other_nm || t('msg.user', 'User')} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>{thread.other_nm || t('msg.user', 'User')}</span>
                  <span className="anrix-muted" style={{ fontSize: 12 }}>{timeAgo(thread.last_ts)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ color: thread.unread > 0 ? 'var(--anrix-text-strong)' : 'var(--anrix-text-muted)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {thread.last_voice ? <IonIcon icon={micOutline} /> : thread.unread === 0 && thread.last_body ? <IonIcon icon={checkmarkDone} style={{ color: 'var(--anrix-info)' }} /> : null}
                    {thread.last_voice ? t('msg.voiceMessage', 'Voice message') : (thread.last_body || (thread.other_rle ? thread.other_rle : t('msg.sayHello', 'Say hello')))}
                  </span>
                  {thread.unread > 0 && (
                    <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
                      {thread.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Pressable>
        ))}
      </AnimatedPage>
    </PageShell>
  );
}
