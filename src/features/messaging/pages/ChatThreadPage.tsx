import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonIcon, IonFooter,
} from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { call, videocam, micOutline, addCircleOutline, send } from 'ionicons/icons';
import { Avatar } from '@design/primitives';
import { useAuthStore } from '@stores/authStore';
import { messagingApi } from '@services/api/messagingApi';
import { profileApi } from '@services/api/profileApi';

/** :id is the OTHER user's id. We get-or-create the 1:1 thread, then load/poll it. */
export function ChatThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const myId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');

  const other = useQuery({ queryKey: ['user', id], queryFn: () => profileApi.getById(id), enabled: !!id });
  const thread = useQuery({ queryKey: ['messaging', 'thread', id], queryFn: () => messagingApi.start(id), enabled: !!id });
  const thrdId = thread.data?.thrd_id;

  const messages = useQuery({
    queryKey: ['messaging', 'messages', thrdId],
    queryFn: () => messagingApi.messages(thrdId!),
    enabled: !!thrdId,
    refetchInterval: 4000,
  });

  const sendMut = useMutation({
    mutationFn: (body: string) => messagingApi.send(thrdId!, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messaging', 'messages', thrdId] }),
  });

  const sendMsg = () => { const t = text.trim(); if (!t || !thrdId) return; setText(''); sendMut.mutate(t); };
  const msgs = messages.data ?? [];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/app/messages" /></IonButtons>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={other.data?.name || t('msg.user', 'User')} size={36} online />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#ffffff' }}>{other.data?.name || t('msg.user', 'User')}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{(other.data as any)?.activeRole?.rle_nm || t('msg.online', 'online')}</div>
            </div>
          </div>
          <IonButtons slot="end">
            <button style={iconBtn}><IonIcon icon={call} /></button>
            <button style={iconBtn}><IonIcon icon={videocam} /></button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': 'var(--anrix-bg)' } as React.CSSProperties}>
        {(thread.isLoading || messages.isLoading) && <BrandLoader />}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msgs.length === 0 && !messages.isLoading && (
            <div style={{ textAlign: 'center', color: 'var(--anrix-text-muted)', padding: 24, fontSize: 13.5 }}>{t('msg.sayHelloWave', 'Say hello 👋')}</div>
          )}
          {msgs.map((m: any) => {
            const me = String(m.sndr_usr_id) === String(myId);
            const time = m.i_ts ? new Date(m.i_ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <div key={m.msg_id} style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '76%' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 16,
                  borderBottomRightRadius: me ? 4 : 16, borderBottomLeftRadius: me ? 16 : 4,
                  background: me ? 'var(--anrix-primary)' : 'var(--anrix-surface)',
                  color: me ? '#fff' : 'var(--anrix-text-strong)',
                  border: me ? 'none' : '1px solid var(--anrix-border)',
                }}>
                  {m.voice_secs ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <IonIcon icon={micOutline} /> ▶ ▬▬▬▬▬ 0:0{m.voice_secs}
                    </span>
                  ) : m.body_tx}
                </div>
                <div style={{ fontSize: 10, color: 'var(--anrix-text-muted)', textAlign: me ? 'right' : 'left', marginTop: 2 }}>{time}</div>
              </div>
            );
          })}
        </div>
      </IonContent>

      <IonFooter>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--anrix-surface)', borderTop: '1px solid var(--anrix-border)' }}>
          <IonIcon icon={addCircleOutline} style={{ fontSize: 26, color: 'var(--anrix-text-muted)' }} />
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
            placeholder={t('msg.messagePlaceholder', 'Message…')} style={{ flex: 1, height: 42, border: '1px solid var(--anrix-border)', borderRadius: 21, padding: '0 16px', background: 'var(--anrix-bg)', color: 'var(--anrix-text-strong)', outline: 'none' }} />
          <button onClick={text ? sendMsg : undefined} style={{ ...iconBtn, background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', borderRadius: '50%', width: 42, height: 42 }}>
            <IonIcon icon={text ? send : micOutline} style={{ fontSize: 20 }} />
          </button>
        </div>
      </IonFooter>
    </IonPage>
  );
}

const iconBtn: React.CSSProperties = {
  display: 'grid', placeItems: 'center', width: 38, height: 38, border: 'none', background: 'transparent', color: 'var(--anrix-text)', cursor: 'pointer', fontSize: 20,
};
