/**
 * Credit view-models & helpers. Orders come from the backend (`GET /credit/orders`)
 * and buyable materials from `GET /materials/catalog` — no hardcoded data here.
 */
export interface OrderItem { name: string; emoji: string; unit: string; qty: number; price: number; }
export interface CreditOrder {
  id: string;
  items: OrderItem[];
  total: number;
  vendor: string;
  orderedAt: string;
  /** ISO date the repayment is due */
  dueISO: string;
  tenureDays: number;
  status: 'due' | 'paid';
  paidAt?: string;
}

export const TENURES = [7, 15, 30] as const;

/** Days remaining until due (negative = overdue). */
export function daysLeft(dueISO: string): number {
  return Math.ceil((new Date(dueISO).getTime() - Date.now()) / 86400000);
}
