import { apiGet } from './client';

type ItemDetail = {
  item_id: number; nm_tx: string; price_am: number; unit_tx: string; img_url_tx?: string; icn_tx?: string;
  ctgry_cd: string; ctgry_nm: string; sub_ctgry_tx?: string; brnd_tx?: string; eta_min?: number; poplr_in?: number;
  variants: { variant_id: number; clr_nm: string; clr_hex?: string; price_am?: number; img_url_tx?: string }[];
  specs: { k_tx: string; v_tx: string }[];
  features: string[];
  packs: { mult_qty: number; label_tx?: string }[];
  highlights: { icn_tx: string; label_tx: string }[];
};

/**
 * Public, no-login reads for GUEST browsing — hits the backend's `/api/web/*`
 * routes, which require no auth. The shared http client only attaches a token
 * when one exists, so these work fine for a signed-out visitor. Personal/commit
 * actions (order, hire, post) still go through the authenticated APIs after login.
 */
export const publicApi = {
  materialCategories: () => apiGet<any[]>('/web/material-categories'),
  materials: (params?: { category?: string; q?: string; subType?: string; brand?: string; sort?: 'new'; limit?: number }) => apiGet<any[]>('/web/materials', { params }),
  // Product-depth drill: category → sub-types → brands → item detail (variants/specs/features).
  materialSubtypes: (category: string) => apiGet<any[]>('/web/material-subtypes', { params: { category } }),
  materialBrands: (category: string, subType?: string) => apiGet<any[]>('/web/material-brands', { params: { category, subType } }),
  materialItem: (id: number | string) => apiGet<ItemDetail>(`/web/material-item/${id}`),
  // Storefront marketing banners (slot 'hero' | 'ad' | 'coupon') — DB-managed.
  promos: (slot: 'hero' | 'ad' | 'coupon') => apiGet<any[]>('/web/promos', { params: { slot } }),
  materialHighlights: () => apiGet<any[]>('/web/material-highlights'),
  materialKits: () => apiGet<any[]>('/web/material-kits'),
  materialKit: (id: number | string) => apiGet<any>(`/web/material-kit/${id}`),
  jobs: (params?: { trade?: string; limit?: number }) => apiGet<any[]>('/web/jobs', { params }),
  equipment: (params?: { category?: string; limit?: number }) => apiGet<any[]>('/web/equipment', { params }),
  professionals: (kind: string, params?: { limit?: number }) => apiGet<any[]>('/web/professionals', { params: { kind, ...(params || {}) } }),
};
