import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonIcon, useIonToast } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery } from '@tanstack/react-query';
import {
  addCircleOutline, megaphoneOutline, chatbubbleEllipsesOutline, checkmarkCircle, star,
  shieldCheckmark, chevronDown, locationOutline, cashOutline,
} from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { Thumb } from '@components/media/Thumb';
import { GradientButton } from '@design/primitives';
import { requirementsApi } from '@services/api/requirementsApi';
import { serviceMeta, roleLabel, type ServiceType } from '../store/requirementsStore';
import type { Role } from '@models/roles';

type SortKey = 'rating' | 'price' | 'recent';

interface Resp { id: string; usrId: number; name: string; role: Role; rating: number; price: string; message: string; respondedAt: string; accepted: boolean; }

/** The demand-side inbox: your posts → responses → compare → connect. */
export function MyPostsPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const [toast] = useIonToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('rating');

  const { data: rawPosts = [], isLoading } = useQuery({ queryKey: ['requirements', 'mine'], queryFn: () => requirementsApi.mine() });
  const respQuery = useQuery({
    queryKey: ['requirements', 'responses', openId],
    queryFn: () => requirementsApi.responses(openId!),
    enabled: !!openId,
  });

  const myPosts = useMemo(() => rawPosts.map((r: any) => ({
    id: String(r.rqrmnt_id), type: (r.srvc_type_cd || 'other') as ServiceType, title: r.ttl_tx,
    location: r.lctn_tx || '', budget: r.bdgt_tx || '', count: Number(r.responses) || 0,
  })), [rawPosts]);

  const mapResp = (x: any): Resp => ({
    id: String(x.rspns_id), usrId: x.rspndr_usr_id, name: x.rspndr_nm || 'Member',
    role: (x.rspndr_rle || '') as Role, rating: Number(x.rtng_nm) || 0, price: x.price_tx || '—',
    message: x.msg_tx || '', respondedAt: x.rspndd_ts ? new Date(x.rspndd_ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '',
    accepted: x.accptd_in === 1,
  });

  const sortResponses = (list: Resp[]): Resp[] => {
    const copy = [...list];
    if (sort === 'rating') copy.sort((a, b) => b.rating - a.rating);
    if (sort === 'price') copy.sort((a, b) => priceNum(a.price) - priceNum(b.price));
    copy.sort((a, b) => Number(b.accepted) - Number(a.accepted));
    return copy;
  };

  const connect = (r: Resp) => { void toast({ message: t('req.connectingWith', 'Connecting with {{name}}…', { name: r.name }), duration: 1200, position: 'top' }); history.push(`/app/chat/${r.usrId}`); };

  return (
    <PageShell
      title={t('req.myPostsTitle', 'My Posts & Responses')}
      showBack
      footer={<GradientButton icon={addCircleOutline} onClick={() => history.push('/app/post-requirement')}>{t('req.postNewRequirement', 'Post a new requirement')}</GradientButton>}
    >
      <AnimatedPage>
        <div style={{ padding: 16 }}>
          {isLoading && <BrandLoader />}
          {!isLoading && myPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 46 }}>📣</div>
              <h3 style={{ margin: '10px 0 4px', fontSize: 18, fontWeight: 800 }}>{t('req.noPostsYet', 'No posts yet')}</h3>
              <p className="anrix-muted" style={{ fontSize: 14, margin: '0 0 18px' }}>
                {t('req.noPostsSubtitle', 'Post what you need — builders, workers, experts, suppliers or lenders will send quotes you can compare here.')}
              </p>
              <GradientButton icon={megaphoneOutline} full={false} onClick={() => history.push('/app/post-requirement')}>{t('req.postARequirement', 'Post a requirement')}</GradientButton>
            </div>
          )}

          {myPosts.map((r) => {
            const m = serviceMeta(r.type);
            const open = openId === r.id;
            const resp = open ? (respQuery.data ?? []).map(mapResp) : [];
            return (
              <div key={r.id} className="anrix-card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
                <button onClick={() => setOpenId(open ? null : r.id)} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 12, padding: 14, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <Thumb img={m.image} emoji={m.emoji} size={44} radius={13} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{r.title}</div>
                    <div className="anrix-muted" style={{ fontSize: 12.5, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span><IonIcon icon={locationOutline} style={{ verticalAlign: '-2px' }} /> {r.location}</span>
                      {r.budget && <span><IonIcon icon={cashOutline} style={{ verticalAlign: '-2px' }} /> {r.budget}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--anrix-primary-strong)' }}>{r.count}</div>
                    <div className="anrix-muted" style={{ fontSize: 10.5 }}>{t('req.quotes', 'quotes')}</div>
                  </div>
                  <IonIcon icon={chevronDown} style={{ fontSize: 18, color: 'var(--anrix-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {open && (
                  <div style={{ borderTop: '1px solid var(--anrix-border)', padding: '12px 14px 14px', background: 'var(--anrix-surface-2)' }}>
                    {respQuery.isLoading ? (
                      <BrandLoader />
                    ) : resp.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 20, color: 'var(--anrix-text-muted)', fontSize: 13 }}>{t('req.noQuotesYet', 'No quotes yet — matching pros are being notified.')}</div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span className="anrix-muted" style={{ fontSize: 12, fontWeight: 600 }}>{t('req.sort', 'Sort:')}</span>
                          {(['rating', 'price', 'recent'] as SortKey[]).map((k) => (
                            <button key={k} onClick={() => setSort(k)} style={sortChip(sort === k)}>
                              {k === 'rating' ? t('req.sortRating', '★ Rating') : k === 'price' ? t('req.sortPrice', '₹ Price') : t('req.sortRecent', '⏱ Recent')}
                            </button>
                          ))}
                        </div>
                        {sortResponses(resp).map((x) => (
                          <ResponseRow key={x.id} r={x} onChat={() => history.push(`/app/chat/${x.usrId}`)} onAccept={() => connect(x)} />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AnimatedPage>
    </PageShell>
  );
}

function ResponseRow({ r, onChat, onAccept }: { r: Resp; onChat: () => void; onAccept: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ background: 'var(--anrix-surface)', border: `1.5px solid ${r.accepted ? 'var(--anrix-primary)' : 'var(--anrix-border)'}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--anrix-primary-soft)', display: 'grid', placeItems: 'center', fontWeight: 800, color: 'var(--anrix-primary-strong)', flexShrink: 0 }}>
          {r.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</span>
            {r.rating >= 4.5 && <IonIcon icon={shieldCheckmark} style={{ fontSize: 14, color: 'var(--anrix-primary-strong)' }} />}
          </div>
          <div className="anrix-muted" style={{ fontSize: 12, marginTop: 1 }}>
            {roleLabel(r.role)} · <IonIcon icon={star} style={{ color: 'var(--anrix-warning)', fontSize: 11, verticalAlign: '-1px' }} /> {r.rating.toFixed(1)}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{r.price}</div>
          <div className="anrix-muted" style={{ fontSize: 10.5 }}>{r.respondedAt}</div>
        </div>
      </div>
      {r.message && <p className="anrix-muted" style={{ fontSize: 13, margin: '10px 0 0' }}>{r.message}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <GradientButton variant="outline" full icon={chatbubbleEllipsesOutline} onClick={onChat} style={{ flex: 1 }}>{t('req.chat', 'Chat')}</GradientButton>
        {r.accepted ? (
          <div style={{ flex: 1, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 14 }}>
            <IonIcon icon={checkmarkCircle} /> {t('req.accepted', 'Accepted')}
          </div>
        ) : (
          <GradientButton full icon={checkmarkCircle} onClick={onAccept} style={{ flex: 1 }}>{t('req.connect', 'Connect')}</GradientButton>
        )}
      </div>
    </div>
  );
}

function priceNum(p: string): number {
  const lakh = /l/i.test(p);
  const num = parseFloat(p.replace(/[^0-9.]/g, '')) || 0;
  return lakh ? num * 100000 : num;
}

const sortChip = (on: boolean): React.CSSProperties => ({
  padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  border: on ? '1.5px solid transparent' : '1.5px solid var(--anrix-border)',
  background: on ? 'var(--anrix-primary)' : 'var(--anrix-surface)', color: on ? 'var(--anrix-on-primary)' : 'var(--anrix-text)',
});
