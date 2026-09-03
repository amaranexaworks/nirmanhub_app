import type { Archetype } from '@models/roles';

export interface DocReq {
  key: string;
  label: string;
  hint: string;
  /** safety-critical doc (e.g. police verification for home-entry workers) */
  critical?: boolean;
}

/** Documents everyone must submit. */
const COMMON: DocReq[] = [
  { key: 'aadhaar', label: 'Aadhaar Card', hint: 'Government identity proof' },
  { key: 'photo', label: 'Live Selfie', hint: 'Face match with your ID' },
  { key: 'address', label: 'Address Proof', hint: 'Utility bill / rent agreement' },
];

/** Extra documents required per archetype — this is what makes a profile trustworthy & traceable. */
const EXTRA: Record<Archetype, DocReq[]> = {
  seeker: [],
  worker: [
    { key: 'pan', label: 'PAN Card', hint: 'For payments & payouts' },
    { key: 'skill', label: 'Skill Certificate', hint: 'ITI / trade proof (optional but boosts trust)' },
    { key: 'police', label: 'Police Verification', hint: 'Required to work inside homes', critical: true },
  ],
  expert: [
    { key: 'pan', label: 'PAN Card', hint: 'For payments' },
    { key: 'license', label: 'Professional License', hint: 'CoA / PE / degree certificate', critical: true },
  ],
  orchestrator: [
    { key: 'pan', label: 'PAN / Company PAN', hint: 'Business identity' },
    { key: 'gst', label: 'GST Certificate', hint: 'Business registration' },
    { key: 'company', label: 'Company Registration', hint: 'Incorporation / Udyam', critical: true },
  ],
  vendor: [
    { key: 'gst', label: 'GST Certificate', hint: 'Business registration', critical: true },
    { key: 'trade', label: 'Trade / Shop License', hint: 'Local trade license' },
  ],
  financier: [
    { key: 'pan', label: 'PAN Card', hint: 'Entity identity' },
    { key: 'lending', label: 'Lending License', hint: 'RBI / NBFC / Bank authorization', critical: true },
  ],
  // Admins are internal staff — they don't go through customer KYC.
  admin: [],
};

export function docsFor(archetype: Archetype): DocReq[] {
  return [...COMMON, ...EXTRA[archetype]];
}
