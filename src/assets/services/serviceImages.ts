import { ROLE_IMAGE, type Role } from '@models/roles';

/**
 * Branded service/model photos — YOUR Karya-Hero-style images.
 *
 * Drop image files into this folder (`src/assets/services/`) named after the trade/role,
 * e.g. `mason.png`, `labour.jpg`, `housekeeping.webp`, `welder.png`. Every worker card and
 * service tile in the app then shows your branded model for that trade — automatically, with
 * no code changes. Until a file exists for a trade, the card falls back to the generic real
 * trade photo (`ROLE_IMAGE`), so nothing ever breaks.
 *
 * Accepted extensions: png, jpg, jpeg, webp. Filenames are matched case-insensitively.
 * A few friendly aliases are supported (see ALIAS_TO_ROLE) — e.g. `mistri.png` maps to mason,
 * `cleaning.png` to housekeeping — so you can name files the way your brand names the service.
 */
const modules = import.meta.glob('./*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' }) as Record<string, string>;

/** Brand service-name → our internal role code, so files can be named either way. */
const ALIAS_TO_ROLE: Record<string, string> = {
  mistri: 'mason',
  brick_mistri: 'mason',
  tile_mistri: 'tile_worker',
  tile: 'tile_worker',
  tiles: 'tile_worker',
  cleaning: 'housekeeping',
  maid: 'housekeeping',
  labor: 'labour',
  helper: 'labour',
  van: 'driver',
  operator: 'equipment_operator',
  consultant: 'civil_engineer',
};

const BY_ROLE: Record<string, string> = {};
for (const path in modules) {
  const file = (path.split('/').pop() || '').toLowerCase();
  const base = file.replace(/\.(png|jpe?g|webp)$/i, '');
  const role = ALIAS_TO_ROLE[base] || base;
  BY_ROLE[role] = modules[path];
  BY_ROLE[base] = modules[path]; // also reachable by the literal filename
}

/** True if a branded photo has been added for this trade. */
export function hasServiceImage(role: Role | string): boolean {
  return !!BY_ROLE[String(role).toLowerCase()];
}

/**
 * The best photo for a trade, in priority order:
 *   1. the person's own uploaded photo (if any),
 *   2. your branded service photo from this folder (if added),
 *   3. the generic real trade-in-action photo (always available).
 */
export function tradePhoto(role: Role | string, uploaded?: string | null): string {
  const key = String(role).toLowerCase();
  return uploaded || BY_ROLE[key] || ROLE_IMAGE[role as Role];
}
