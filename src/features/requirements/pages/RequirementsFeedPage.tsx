import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { IonToast, IonIcon } from '@ionic/react';
import { useQuery } from '@tanstack/react-query';
import { locationOutline, cashOutline, businessOutline, layersOutline, chatbubbleEllipsesOutline, pricetagOutline, checkmarkCircle, fileTrayFullOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { Thumb } from '@components/media/Thumb';
import { Badge, GradientButton } from '@design/primitives';
import { useAuthStore } from '@stores/authStore';
import { requirementsApi } from '@services/api/requirementsApi';
import { SERVICES, serviceMeta, canFulfil, type ServiceType, type Requirement } from '../store/requirementsStore';

/** Map a backend requirement row → the page's Requirement shape. */
const mapReq = (r: any, myId?: string): Requirement => ({
  id: String(r.rqrmnt_id),
  type: (r.srvc_type_cd || 'other') as ServiceType,
  title: r.ttl_tx,
  location: r.lctn_tx || '',
  budget: r.bdgt_tx || undefined,
  areaSqft: r.area_sqft || undefined,
  floors: r.floors || undefined,
  description: r.dscn_tx || undefined,
  postedByName: r.postd_by_nm || 'Member',
  postedAt: r.postd_ts ? new Date(r.postd_ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '',
  responses: Number(r.responses) || 0,
  mine: myId != null && String(r.postd_by_usr_id) === String(myId),
});

export function RequirementsFeedPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const user = useAuthStore((s) => s.user);
  const roles = user?.roles ?? [];
  const { data: raw = [] } = useQuery({ queryKey: ['requirements', 'feed'], queryFn: () => requirementsApi.list({ limit: 50 }) });
  const requirements = useMemo(() => raw.map((r: any) => mapReq(r, user?.id)), [raw, user?.id]);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const hasResponded = (id: string) => respondedIds.has(id);
  const [filter, setFilter] = useState<ServiceType | 'all' | 'matched'>('matched');
  const [quoting, setQuoting] = useState<Requirement | null>(null);
  const [toast, setToast] = useState('');

  const list = useMemo(() => {
    const feed = requirements.filter((r) => !r.mine); // your own posts live under "My posts"
    if (filter === 'all') return feed;
    if (filter === 'matched') {
      const matched = feed.filter((r) => canFulfil(r.type, roles));
      return matched.length ? matched : feed;
    }
    return feed.filter((r) => r.type === filter);
  }, [requirements, filter, roles]);

  return (
    <PageShell
      title={t('req.openWorkBoard', 'Open Work Board')}
      showBack
      footer={<GradientButton variant="outline" icon={fileTrayFullOutline} onClick={() => history.push('/app/my-posts')}>{t('req.myPostsResponses', 'My posts & responses')}</GradientButton>}
    >
      <div className="no-scrollbar" style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 16px 12px', background: 'var(--anrix-bg)' }}>
        <Chip on={filter === 'matched'} onClick={() => setFilter('matched')} label={t('req.forYou', '✦ For you')} />
        <Chip on={filter === 'all'} onClick={() => setFilter('all')} label={t('req.all', 'All')} />
        {SERVICES.filter((s) => s.type !== 'other').map((s) => (
          <Chip key={s.type} on={filter === s.type} onClick={() => setFilter(s.type)} label={`${s.emoji} ${s.label}`} />
        ))}
      </div>

      <AnimatedPage>
        <div style={{ padding: '0 12px 16px' }}>
          {list.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--anrix-text-muted)' }}>{t('req.noOpenWork', 'No open work here yet.')}</div>}
          {list.map((r) => {
            const m = serviceMeta(r.type);
            const mine = canFulfil(r.type, roles);
            const responded = hasResponded(r.id);
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                style={{ marginBottom: 12, borderRadius: 16, background: 'var(--anrix-surface)', border: '1px solid var(--anrix-border-strong)', boxShadow: 'var(--anrix-shadow-2)', overflow: 'hidden' }}
              >
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Thumb img={m.image} emoji={m.emoji} size={44} radius={12} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--anrix-primary-strong)' }}>{m.label}</span>
                        {mine && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--anrix-success)', background: 'rgba(31,169,113,0.14)', padding: '2px 7px', borderRadius: 999 }}>{t('req.forYou', '✦ For you')}</span>
                        )}
                        <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--anrix-primary-strong)', background: 'var(--anrix-primary-soft)', padding: '3px 9px', borderRadius: 999 }}>{t('req.quotesCount', '{{count}} quotes', { count: r.responses })}</span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15.5, lineHeight: 1.25, marginTop: 4 }}>{r.title}</div>
                      <div className="anrix-muted" style={{ fontSize: 12, marginTop: 2 }}>{r.postedByName} · {r.postedAt}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    <Badge tone="info" icon={locationOutline}>{r.location}</Badge>
                    {r.budget && <Badge tone="success" icon={cashOutline}>{r.budget}</Badge>}
                    {r.areaSqft && <Badge tone="neutral" icon={businessOutline}>{t('req.sqft', '{{count}} sqft', { count: r.areaSqft })}</Badge>}
                    {r.floors && <Badge tone="neutral" icon={layersOutline}>{t('req.floors', '{{count}} floors', { count: r.floors })}</Badge>}
                  </div>
                  {r.description && <p className="anrix-muted" style={{ fontSize: 12.5, lineHeight: 1.45, margin: '8px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</p>}

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {responded ? (
                      <div style={{ flex: 1, height: 42, borderRadius: 'var(--anrix-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 14 }}>
                        {t('req.quoteSent', '✓ Quote sent')}
                      </div>
                    ) : (
                      <button onClick={() => setQuoting(r)} className="anrix-pressable"
                        style={{ flex: 2, height: 42, borderRadius: 'var(--anrix-radius-md)', border: 'none', background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <IonIcon icon={pricetagOutline} style={{ fontSize: 17 }} /> {t('req.sendQuote', 'Send quote')}
                      </button>
                    )}
                    <button onClick={() => history.push(`/app/chat/${r.id}`)} className="anrix-pressable"
                      style={{ flex: 1, height: 42, borderRadius: 'var(--anrix-radius-md)', border: '1.5px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', color: 'var(--anrix-text-strong)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <IonIcon icon={chatbubbleEllipsesOutline} style={{ fontSize: 17 }} /> {t('req.chat', 'Chat')}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatedPage>

      {quoting && (
        <QuoteSheet
          requirement={quoting}
          onClose={() => setQuoting(null)}
          onSubmit={async (price, message) => {
            try {
              await requirementsApi.respond(quoting.id, { price, message });
              setRespondedIds((s) => new Set(s).add(quoting.id));
              setQuoting(null);
              setToast(t('req.quoteSentToast', 'Quote sent! The poster can now compare & connect with you.'));
            } catch (e: any) {
              setToast(e.message || t('req.couldNotSendQuote', 'Could not send quote'));
            }
          }}
        />
      )}
      <IonToast isOpen={!!toast} message={toast} duration={1500} onDidDismiss={() => setToast('')} />
    </PageShell>
  );
}

function QuoteSheet({ requirement, onClose, onSubmit }: { requirement: Requirement; onClose: () => void; onSubmit: (price: string, message: string) => void }) {
  const { t } = useTranslation();
  const m = serviceMeta(requirement.type);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState(t('req.defaultQuoteMessage', 'Available to start this week. Happy to visit the site first.'));
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,12,0.55)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: 'var(--anrix-surface)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '20px 18px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))', boxShadow: '0 -12px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--anrix-border-strong)', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--anrix-primary-strong)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.emoji} {m.label}</div>
        <h3 style={{ margin: '4px 0 2px', fontSize: 17, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>{t('req.sendYourQuote', 'Send your quote')}</h3>
        <p className="anrix-muted" style={{ margin: '0 0 16px', fontSize: 13 }}>{requirement.title} · {requirement.location}</p>

        <div style={sheetLabel}>{t('req.price', 'Price')}</div>
        <input autoFocus value={price} placeholder={m.priceHint} onChange={(e) => setPrice(e.target.value)} style={sheetInput} />

        <div style={{ ...sheetLabel, marginTop: 14 }}>{t('req.message', 'Message')}</div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} style={{ ...sheetInput, height: 'auto', paddingTop: 12, resize: 'vertical' }} />

        <div style={{ marginTop: 18 }}>
          <GradientButton icon={checkmarkCircle} disabled={!price.trim()} onClick={() => onSubmit(price.trim(), message.trim())}>{t('req.sendQuote', 'Send quote')}</GradientButton>
        </div>
      </div>
    </div>
  );
}

function Chip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      whiteSpace: 'nowrap', padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      border: on ? '1.5px solid transparent' : '1.5px solid var(--anrix-border)',
      background: on ? 'var(--anrix-primary)' : 'var(--anrix-surface)', color: on ? 'var(--anrix-on-primary)' : 'var(--anrix-text)',
    }}>{label}</button>
  );
}

const sheetLabel: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', textTransform: 'uppercase', marginBottom: 8 };
const sheetInput: React.CSSProperties = { width: '100%', height: 50, borderRadius: 12, border: '1.5px solid var(--anrix-border)', background: 'var(--anrix-surface)', padding: '0 14px', fontSize: 15, color: 'var(--anrix-text-strong)', outline: 'none' };
