/** Buyer-facing materials catalog for the instant-order (quick commerce) flow. */
export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  /** real product photo (from the backend); falls back to emoji when absent */
  image?: string;
  category: ShopCategory;
  price: number;
  unit: string;
  /** Typical site delivery time, shown Zepto-style. */
  etaMin: number;
  popular?: boolean;
}

export type ShopCategory =
  | 'Cement & Aggregates'
  | 'Steel'
  | 'Bricks & Blocks'
  | 'Plumbing'
  | 'Electrical'
  | 'Paint & Finish'
  | 'Tools'
  | 'Safety'
  | 'Other';

// Catalog data now comes from the backend (`GET /materials/catalog` &
// `/materials/categories`). The types above are the shared view-model; no
// hardcoded product list lives here anymore.
