import { IonIcon } from '@ionic/react';
import { cloudDoneOutline, cloudOfflineOutline, syncOutline, warningOutline } from 'ionicons/icons';
import { useSyncStatus } from '@services/sync';

/**
 * A compact indicator of offline-sync state for the workforce board. It stays
 * invisible when everything is saved and online (no clutter), and surfaces a
 * pill when writes are queued offline, syncing, or parked after failures — so a
 * supervisor on a weak-signal site knows their entries are captured, not lost.
 */
export function SyncStatusPill() {
  const { pending, failed, online, retry } = useSyncStatus();

  // Nothing to say — all writes are on the server.
  if (pending === 0 && failed === 0) return null;

  const [bg, fg, icon, label] = failed > 0
    ? ['var(--anrix-danger-tint, #fdecec)', 'var(--anrix-danger, #c0392b)', warningOutline, `${failed} failed to save`]
    : !online
      ? ['#fff4d6', 'var(--anrix-primary-strong, #8a6d00)', cloudOfflineOutline, `Offline — ${pending} saved on this device`]
      : ['#eaf4ff', '#1c5fa8', syncOutline, `Syncing ${pending}…`];

  return (
    <button
      onClick={() => retry()}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, margin: '0 16px 10px',
        padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
        background: bg, color: fg, fontSize: 12.5, fontWeight: 700,
      }}
    >
      <IonIcon icon={pending === 0 && failed === 0 ? cloudDoneOutline : icon} />
      {label}
    </button>
  );
}
