import { apiGet } from './client';

export interface ApiWorker {
  usr_id: number; dsply_nm: string; avtr_url_tx?: string; cty_nm?: string; pncd_tx?: string;
  rtng_nm?: number; rtng_cnt?: number; day_rate_am?: number; srvc_rds_km?: number; kyc_tier_cd?: string;
  rle_id: number; rle_cd: string; rle_nm: string; emoji_tx?: string; archtyp_cd: string;
}
export interface ApiMarketRate { rle_cd: string; rle_nm: string; emoji_tx?: string; avg_am: number; min_am?: number; max_am?: number; smpls_cnt?: number; }

export const hiringApi = {
  search: (params: { trade?: string; city?: string; q?: string; limit?: number; offset?: number } = {}) =>
    apiGet<ApiWorker[]>('/hiring/search', { params }),
  marketRates: () => apiGet<ApiMarketRate[]>('/hiring/market-rates'),
};
