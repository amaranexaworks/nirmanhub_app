import { ROLE_CATALOG, type Archetype, type Role } from '@models/roles';

/**
 * Requirements marketplace — shared service-type catalogue + pure helpers.
 *   Demand side → a user POSTS a Requirement ("I need X, budget Y").
 *   Supply side → matching roles RESPOND with a quote (all via /api/requirements).
 * The live requirements and responses come from the backend; this module holds ONLY
 * the service catalogue (types, labels, tile images, who fulfils what) and helpers.
 * (No local/seeded data — the marketplace is fully DB-driven.)
 */
export type ServiceType =
  | 'build_house' | 'renovation' | 'interior' | 'painting' | 'plumbing'
  | 'electrical' | 'tiling' | 'waterproofing' | 'borewell'
  | 'daily_labour' | 'consult' | 'materials' | 'equipment' | 'finance' | 'other';

export interface Requirement {
  id: string;
  type: ServiceType;
  title: string;
  location: string;
  budget?: string;
  areaSqft?: number;
  floors?: number;
  description?: string;
  postedByName: string;
  postedAt: string;
  responses: number;
  /** true when THIS user posted it (drives the "My posts" inbox) */
  mine?: boolean;
}

export interface ServiceMeta {
  type: ServiceType;
  label: string;
  emoji: string;
  /** real photo (Unsplash CDN, verified) shown on the needs grid; emoji is the fallback */
  image: string;
  /** which roles should see (and can fulfil) this requirement */
  fulfillers: Role[];
  /** show the area/floors fields (construction-scale jobs) */
  construction?: boolean;
  /** hint shown on the quote sheet, e.g. "Your quote" vs "Your day rate" */
  priceHint: string;
}

const SIMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=120&h=120&fit=crop&q=70&auto=format`;

export const SERVICES: ServiceMeta[] = [
  { type: 'build_house', label: 'Build a House', emoji: '🏗️', image: SIMG('1541888946425-d81bb19240f5'), fulfillers: ['builder', 'contractor'], construction: true, priceHint: 'Your quote (e.g. ₹38 L all-in)' },
  { type: 'renovation', label: 'Renovation', emoji: '🔨', image: SIMG('1580901368919-7738efb0f87e'), fulfillers: ['builder', 'contractor', 'mason'], construction: true, priceHint: 'Your quote (e.g. ₹4 L)' },
  { type: 'interior', label: 'Interior Design', emoji: '🛋️', image: SIMG('1586023492125-27b2c045efd7'), fulfillers: ['interior_designer', 'carpenter'], priceHint: 'Your quote / design fee' },
  { type: 'painting', label: 'Painting', emoji: '🎨', image: SIMG('1562259949-e8e7689d7828'), fulfillers: ['painter'], priceHint: 'Your quote (e.g. ₹18/sqft)' },
  { type: 'plumbing', label: 'Plumbing', emoji: '🚰', image: SIMG('1607472586893-edb57bdc0e39'), fulfillers: ['plumber'], priceHint: 'Your quote / visit charge' },
  { type: 'electrical', label: 'Electrical', emoji: '⚡', image: SIMG('1621905252507-b35492cc74b4'), fulfillers: ['electrician'], priceHint: 'Your quote / visit charge' },
  { type: 'tiling', label: 'Tiling', emoji: '🟦', image: SIMG('1615529182904-14819c35db37'), fulfillers: ['tile_worker', 'mason'], priceHint: 'Your quote (e.g. ₹35/sqft)' },
  { type: 'waterproofing', label: 'Waterproofing', emoji: '💧', image: SIMG('1590247813693-5541d1c609fd'), fulfillers: ['waterproofing'], priceHint: 'Your quote' },
  { type: 'borewell', label: 'Borewell', emoji: '🕳️', image: SIMG('1589939705384-5185137a7f0f'), fulfillers: ['borewell'], priceHint: 'Your quote (per ft)' },
  { type: 'daily_labour', label: 'Daily Labour / Crew', emoji: '👷', image: SIMG('1504307651254-35680f356dfd'), fulfillers: ['labour', 'mason', 'carpenter', 'painter', 'labour_contractor'], priceHint: 'Your day rate (e.g. ₹800/day)' },
  { type: 'consult', label: 'Expert Consult', emoji: '📐', image: SIMG('1503387762-592deb58ef4e'), fulfillers: ['architect', 'structural_engineer', 'civil_engineer', 'mep_engineer', 'interior_designer', 'surveyor', 'vastu_consultant'], priceHint: 'Your fee (per day / project)' },
  { type: 'materials', label: 'Materials Supply', emoji: '📦', image: SIMG('1620641788421-7a1c342ea42e'), fulfillers: ['material_supplier', 'hardware_supplier', 'rmc_supplier', 'sanitaryware_supplier', 'water_tanker'], priceHint: 'Your rate (e.g. ₹380/bag)' },
  { type: 'equipment', label: 'Equipment / Transport', emoji: '🚜', image: SIMG('1601584115197-04ecc0da31d7'), fulfillers: ['equipment_rental', 'transport_provider', 'scaffolding_provider'], priceHint: 'Your rental rate' },
  { type: 'finance', label: 'Loan / Finance', emoji: '🏦', image: SIMG('1554224155-6726b3ff858f'), fulfillers: ['banker', 'loan_agent', 'insurance_provider'], priceHint: 'Rate / EMI you offer' },
  { type: 'other', label: 'Other', emoji: '🧰', image: SIMG('1516216628859-9bccecab13ca'), fulfillers: [], priceHint: 'Your quote' },
];

export const serviceMeta = (t: ServiceType) => SERVICES.find((s) => s.type === t)!;

/** True if a user with these roles can fulfil this requirement type. */
export function canFulfil(type: ServiceType, roles: Role[]): boolean {
  const f = serviceMeta(type).fulfillers;
  return f.length === 0 ? false : roles.some((r) => f.includes(r));
}

export const roleLabel = (r: Role) => ROLE_CATALOG[r]?.label ?? r;

/** Service types a given archetype/roles would care to browse (for the feed's default filter). */
export function relevantServices(archetype: Archetype | null, roles: Role[]): ServiceType[] {
  if (!archetype) return [];
  return SERVICES.filter((s) => s.fulfillers.some((r) => roles.includes(r))).map((s) => s.type);
}
