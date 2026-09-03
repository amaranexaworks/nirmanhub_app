import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonIcon,
} from '@ionic/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { chatbubbleEllipsesOutline, navigateCircle, closeOutline } from 'ionicons/icons';
import { Avatar, Badge, RatingStars, GradientButton } from '@design/primitives';
import { ROLE_CATALOG, type Role } from '@models/roles';
import { hiringApi, type ApiWorker } from '@services/api/hiringApi';
import type { Worker } from '@features/hiring/data/worker';

const mapWorker = (w: ApiWorker): Worker => ({
  id: String(w.usr_id), name: w.dsply_nm, trade: w.rle_cd as Role, rating: Number(w.rtng_nm) || 0,
  ratingCount: w.rtng_cnt || 0, distanceKm: 0, dayRate: Number(w.day_rate_am) || 0, available: true,
  verified: w.kyc_tier_cd === 'verified', jobsDone: 0, responseMins: 0, skills: [],
});

/**
 * Nearby-worker map. A stylized street map (CSS) with GPS pins — works offline /
 * without a Maps API key. Swap the backdrop for Mapbox/Google SDK in production.
 * Pins are colored by availability: amber = available now, grey = busy/offline.
 */
export function NearbyMapPage() {
  const history = useHistory();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Worker | null>(null);
  const { data: workers = [] } = useQuery({ queryKey: ['hiring', 'workers'], queryFn: () => hiringApi.search({ limit: 100 }), select: (rows: ApiWorker[]) => rows.map(mapWorker) });

  // Availability is derived here for the demo backdrop; wire to a live status field in production.
  const PINS = useMemo(() => workers.map((w, i) => ({
    worker: w,
    active: i % 4 !== 0,
    left: 18 + ((i * 37) % 64) + (i % 2 ? 6 : 0),
    top: 22 + ((i * 23) % 52) + (i % 3 ? 4 : 0),
  })), [workers]);

  const activeCount = PINS.filter((p) => p.active).length;
  const inactiveCount = PINS.length - activeCount;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/app/home" /></IonButtons>
          <IonTitle>{t('discover.nearbyPros', 'Nearby Pros')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: '#e9eef0' }}>
          {/* Stylized street backdrop */}
          <div style={{ position: 'absolute', inset: 0,
            background:
              'radial-gradient(40% 30% at 22% 70%, #cfe6cf 0%, transparent 60%),' +
              'radial-gradient(30% 24% at 82% 28%, #bfe0ea 0%, transparent 60%),' +
              '#e9eef0' }} />
          <div style={{ position: 'absolute', inset: 0, opacity: 0.5,
            backgroundImage:
              'linear-gradient(#ffffff 3px, transparent 3px), linear-gradient(90deg, #ffffff 3px, transparent 3px),' +
              'linear-gradient(#dfe5e8 1px, transparent 1px), linear-gradient(90deg, #dfe5e8 1px, transparent 1px)',
            backgroundSize: '90px 90px, 90px 90px, 30px 30px, 30px 30px' }} />

          {/* Coverage radius + current location */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 260, height: 260, marginLeft: -130, marginTop: -130, borderRadius: '50%', border: '1.5px solid rgba(245,179,1,0.55)', background: 'rgba(245,179,1,0.08)' }} />
            <motion.div animate={{ scale: [1, 1.6, 1], opacity: [0.35, 0, 0.35] }} transition={{ duration: 2.4, repeat: Infinity }}
              style={{ position: 'absolute', left: '50%', top: '50%', width: 120, height: 120, marginLeft: -60, marginTop: -60, borderRadius: '50%', background: 'rgba(245,179,1,0.22)' }} />
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--anrix-primary)', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
          </div>

          {/* Pins */}
          {PINS.map(({ worker, left, top, active }, i) => {
            const isSel = selected?.id === worker.id;
            const dot = active ? 'var(--anrix-primary)' : 'var(--anrix-text-muted)';
            return (
              <motion.button key={worker.id}
                initial={{ y: -20, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05, type: 'spring', stiffness: 360, damping: 18 }}
                onClick={() => setSelected(worker)}
                style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-100%)', border: 'none', background: 'none', cursor: 'pointer', zIndex: isSel ? 5 : 2 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    padding: '4px 9px 4px 4px', borderRadius: 999, background: '#fff', boxShadow: isSel ? '0 8px 20px rgba(245,179,1,0.4)' : '0 4px 12px rgba(0,0,0,0.18)',
                    display: 'flex', alignItems: 'center', gap: 6, border: isSel ? '2px solid var(--anrix-primary)' : '2px solid #fff',
                    transform: isSel ? 'scale(1.06)' : 'none', transition: 'transform .15s',
                  }}>
                    <div style={{ position: 'relative' }}>
                      <Avatar name={worker.name} size={26} />
                      <span style={{ position: 'absolute', right: -1, bottom: -1, width: 9, height: 9, borderRadius: '50%', background: dot, border: '2px solid #fff' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>₹{worker.dayRate}</span>
                  </div>
                  <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `7px solid ${isSel ? 'var(--anrix-primary)' : '#fff'}`, margin: '0 auto' }} />
                </div>
              </motion.button>
            );
          })}

          {/* Stat header — Total / Active / Busy */}
          <div style={{ position: 'absolute', top: 12, left: 12, right: 12, background: 'var(--anrix-surface)', borderRadius: 'var(--anrix-radius-lg)', boxShadow: 'var(--anrix-shadow-2)', display: 'flex', overflow: 'hidden' }}>
            {[
              { key: 'nearby', label: t('discover.nearby', 'Nearby'), value: PINS.length, color: 'var(--anrix-text-strong)' },
              { key: 'available', label: t('discover.available', 'Available'), value: activeCount, color: 'var(--anrix-primary-strong)' },
              { key: 'busy', label: t('discover.busy', 'Busy'), value: inactiveCount, color: 'var(--anrix-text-muted)' },
            ].map((s, i) => (
              <div key={s.key} style={{ flex: 1, padding: '10px 8px', textAlign: 'center', borderLeft: i ? '1px solid var(--anrix-border)' : 'none' }}>
                <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.4, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--anrix-text-muted)', marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Legend */}
          {!selected && (
            <div style={{ position: 'absolute', bottom: 20, left: 12, display: 'inline-flex', alignItems: 'center', gap: 14, padding: '9px 14px', borderRadius: 999, background: 'var(--anrix-surface)', boxShadow: 'var(--anrix-shadow-2)', fontSize: 12, fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--anrix-primary)' }} /> {t('discover.available', 'Available')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--anrix-text-muted)' }} /> {t('discover.busy', 'Busy')}
              </span>
            </div>
          )}

          {/* Recenter */}
          <button aria-label={t('discover.recenterMap', 'Recenter map')} style={{ position: 'absolute', right: 16, bottom: selected ? 234 : 20, width: 46, height: 46, borderRadius: 14, border: 'none', background: '#fff', boxShadow: 'var(--anrix-shadow-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'bottom .25s' }}>
            <IonIcon icon={navigateCircle} style={{ fontSize: 26, color: 'var(--anrix-primary-strong)' }} />
          </button>

          {/* Selected pro detail sheet */}
          <AnimatePresence>
            {selected && (
              <motion.div initial={{ y: 240 }} animate={{ y: 0 }} exit={{ y: 240 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                style={{ position: 'absolute', left: 12, right: 12, bottom: 16, background: 'var(--anrix-surface)', borderRadius: 'var(--anrix-radius-xl)', boxShadow: 'var(--anrix-shadow-3)', padding: 16, zIndex: 10 }}>
                <button onClick={() => setSelected(null)} aria-label={t('discover.close', 'Close')} style={{ position: 'absolute', top: 12, right: 12, background: 'var(--anrix-surface-2)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                  <IonIcon icon={closeOutline} />
                </button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Avatar name={selected.name} size={52} verified={selected.verified} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.name}</div>
                    <div className="anrix-muted" style={{ fontSize: 13 }}>{ROLE_CATALOG[selected.trade]?.emoji} {ROLE_CATALOG[selected.trade]?.label}</div>
                    <div style={{ marginTop: 4 }}><RatingStars value={selected.rating} count={selected.ratingCount} /></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800 }}>₹{selected.dayRate}<span className="anrix-muted" style={{ fontWeight: 600, fontSize: 11 }}>{t('discover.perDay', '/day')}</span></div>
                    {selected.verified && <Badge tone="success">{t('discover.verified', 'Verified')}</Badge>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <GradientButton variant="outline" full icon={chatbubbleEllipsesOutline} onClick={() => history.push(`/app/chat/${selected.id}`)} style={{ flex: 1 }}>{t('discover.chat', 'Chat')}</GradientButton>
                  <GradientButton full onClick={() => history.push(`/app/pro/${selected.id}`)} style={{ flex: 2 }}>{t('discover.viewProfile', 'View profile')}</GradientButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </IonContent>
    </IonPage>
  );
}
