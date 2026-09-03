import { locationOutline, flashOutline, checkmarkCircle } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { RatingStars } from '@design/primitives';
import { Pressable } from '@components/motion';
import { ROLE_CATALOG } from '@models/roles';
import { tradePhoto } from '@assets/services/serviceImages';
import type { Worker } from '../data/worker';

/** Compact worker card — avatar, name, rating, key meta on one tight row. */
export function WorkerCard({ worker, onOpen }: { worker: Worker; onOpen: (w: Worker) => void }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={() => onOpen(worker)}>
      <div className="anrix-card" style={{ margin: '0 16px 10px', padding: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, overflow: 'hidden', background: 'var(--anrix-primary-soft)', flexShrink: 0 }}>
            <img src={tradePhoto(worker.trade)} alt={worker.name} loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0, fontWeight: 700, fontSize: 15 }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{worker.name}</span>
                {worker.verified && <IonIcon icon={checkmarkCircle} style={{ color: 'var(--anrix-primary-strong)', fontSize: 14, flexShrink: 0 }} />}
              </span>
              <span style={{ fontWeight: 800, fontSize: 15 }}>₹{worker.dayRate}<span className="anrix-muted" style={{ fontWeight: 400, fontSize: 11 }}>{t('hire.perDay', '/day')}</span></span>
            </div>
            <div className="anrix-muted" style={{ fontSize: 12.5, marginTop: 1 }}>
              {ROLE_CATALOG[worker.trade]?.label ?? worker.trade ?? t('hire.worker', 'Worker')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontSize: 12.5, flexWrap: 'wrap' }}>
              <RatingStars value={worker.rating} count={worker.ratingCount} size={13} />
              <span style={{ color: 'var(--anrix-text-muted)' }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--anrix-text-muted)' }}>
                <IonIcon icon={locationOutline} /> {worker.distanceKm}km
              </span>
              {worker.available ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--anrix-success)', fontWeight: 600 }}>
                  <IonIcon icon={flashOutline} /> {t('hire.available', 'Available')}
                </span>
              ) : (
                <span style={{ color: 'var(--anrix-text-muted)' }}>{t('hire.busy', 'Busy')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Pressable>
  );
}
