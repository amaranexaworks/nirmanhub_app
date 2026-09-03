export * from './roles';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  /** set when the account was created via email / Google / Apple sign-in */
  email?: string;
  /** how the user authenticated */
  authProvider?: 'phone' | 'google' | 'apple' | 'email';
  avatarUrl?: string;
  roles: import('./roles').Role[];
  /** the role currently in focus (drives the shell); undefined until roles are picked */
  activeRole?: import('./roles').Role;
  kycTier: 'none' | 'basic' | 'verified';
  /** Effective capabilities from the server (archetype grants + per-user grants).
   *  Undefined for legacy/local sessions — callers fall back to archetype caps. */
  capabilities?: import('./roles').Capability[];
  pincode?: string;
  location?: GeoPoint;
  rating?: number;
  ratingCount?: number;
  // Editable profile fields
  headline?: string;
  bio?: string;
  city?: string;
  dayRate?: number;
  serviceRadiusKm?: number;
  skills?: string[];
  languages?: string[];
}
