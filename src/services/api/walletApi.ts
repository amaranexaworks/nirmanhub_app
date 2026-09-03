import { apiGet, apiPost } from './client';

export interface WalletTxn {
  txn_id: number;
  kind_cd: 'credit' | 'debit';
  amt_am: number;
  ttl_tx: string;
  ref_tx?: string;
  sts_cd: string;
  i_ts: string;
}

/** Per-user wallet ledger. Balance is derived server-side from the ledger. */
export const walletApi = {
  balance: async (): Promise<number> => (await apiGet<{ balance: number }>('/wallet/balance'))?.balance ?? 0,
  transactions: () => apiGet<WalletTxn[]>('/wallet/transactions'),
  addMoney: (amount: number) => apiPost<{ balance: number }>('/wallet/add', { amount }),
  withdraw: (amount: number) => apiPost<{ balance: number }>('/wallet/withdraw', { amount }),
};
