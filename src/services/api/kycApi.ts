import { apiGet, apiPost } from './client';

export interface KycSubmitBody {
  docType: string;
  docNo?: string;
  docUrl?: string;
  tier?: 'basic' | 'verified';
  /** ISO timestamp of the verification slot the user booked (Slice-style). */
  slotTs?: string;
  contactPhone?: string;
}

export const kycApi = {
  status: () => apiGet<any>('/kyc/status'),
  submit: (body: KycSubmitBody) => apiPost('/kyc/submit', body),
  /** Book / re-book a verification slot on the latest pending submission. */
  bookSlot: (slotTs: string, contactPhone?: string) => apiPost('/kyc/slot', { slotTs, contactPhone }),
};
