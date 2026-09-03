import { useState, type CSSProperties } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import { locationOutline, navigateOutline } from 'ionicons/icons';
import { getCurrentLocation, reverseGeocode } from '@services/location/geolocation';

export interface LocationFieldProps {
  value: string;
  onChange: (v: string) => void;
  /** Optional label rendered above the input (uses the standard muted field label). */
  label?: string;
  placeholder?: string;
  /** Style merged into the text input so it blends with the host form. */
  inputStyle?: CSSProperties;
  /** Style for the wrapping element. */
  style?: CSSProperties;
  /** Show the "type an address or tap Locate…" helper line under the field. */
  hint?: boolean;
  autoFocus?: boolean;
}

const defaultInput: CSSProperties = {
  width: '100%', height: 48, borderRadius: 12,
  border: '1.5px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)',
  color: 'var(--anrix-text-strong)', fontSize: 15, outline: 'none', boxSizing: 'border-box',
};
const labelStyle: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--anrix-text-muted)', marginBottom: 7, letterSpacing: 0.2 };

/**
 * Standard location input used everywhere in the app. Type an area/address manually,
 * or tap the map pin to fill it from GPS — reverse-geocoded to a human area name
 * (e.g. "Kukatpally, Hyderabad") rather than raw lat/long. Keeps location entry
 * consistent across supervisors, sites, job posts, requirements and the worker master.
 */
export function LocationField({
  value, onChange, label, placeholder = 'Area, landmark or address', inputStyle, style, hint, autoFocus,
}: LocationFieldProps) {
  const [busy, setBusy] = useState(false);
  const locate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const point = await getCurrentLocation();      // best-effort GPS (falls back to default)
      onChange(await reverseGeocode(point));          // → human area name, never raw coords
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={style}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <IonIcon icon={locationOutline}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--anrix-text-muted)', pointerEvents: 'none' }} />
        <input value={value} autoFocus={autoFocus} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
          style={{ ...defaultInput, ...inputStyle, paddingLeft: 38, paddingRight: 108 }} />
        <button type="button" onClick={locate} disabled={busy} aria-label="Use my current location" className="anrix-pressable"
          style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            height: 34, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 5,
            borderRadius: 999, border: 'none', cursor: busy ? 'wait' : 'pointer',
            background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 12.5,
          }}>
          {busy
            ? <><IonSpinner name="crescent" style={{ width: 14, height: 14 }} /> Locating…</>
            : <><IonIcon icon={navigateOutline} style={{ fontSize: 15 }} /> Locate</>}
        </button>
      </div>
      {hint && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, fontSize: 12, color: 'var(--anrix-text-muted)' }}>
          <IonIcon icon={locationOutline} style={{ fontSize: 14 }} /> Type an address or tap Locate to use your current location.
        </div>
      )}
    </div>
  );
}
