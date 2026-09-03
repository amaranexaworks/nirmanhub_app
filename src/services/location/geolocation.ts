import { Geolocation } from '@capacitor/geolocation';
import type { GeoPoint } from '@models/index';

/** Default centre (Bengaluru) when permission is denied / unavailable. */
export const DEFAULT_LOCATION: GeoPoint = { lat: 12.9716, lng: 77.5946 };

/** Best-effort current position — never throws; falls back to default. */
export async function getCurrentLocation(): Promise<GeoPoint> {
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return DEFAULT_LOCATION;
  }
}

/** Coordinate fallback label when reverse geocoding is unavailable. */
export function approxAddress(p: GeoPoint): string {
  return `Lat ${p.lat.toFixed(4)}, Lng ${p.lng.toFixed(4)}`;
}

/**
 * Reverse-geocode a point to a human area name (e.g. "Kukatpally, Hyderabad")
 * using OpenStreetMap Nominatim — free, no API key. Never throws; falls back to
 * the coordinate label. Swap for Google/Mapbox geocoding in production.
 */
export async function reverseGeocode(p: GeoPoint): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}&zoom=16&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return approxAddress(p);
    const j = await res.json();
    const a = j.address ?? {};
    const area = a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.hamlet;
    const city = a.city || a.town || a.municipality || a.county;
    const label = [area, city].filter(Boolean).join(', ');
    if (label) return label;
    if (typeof j.display_name === 'string') return j.display_name.split(',').slice(0, 2).join(',').trim();
    return approxAddress(p);
  } catch {
    return approxAddress(p);
  }
}

/** Haversine distance in km. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)) * 10) / 10;
}
