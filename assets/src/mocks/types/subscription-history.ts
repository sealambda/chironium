// TEMPORARY: Remove when backend implements subscription history

export type SubscriptionStatus = "active" | "paused" | "expired" | "cancelled";

export interface SubscriptionHistoryRecord {
  id: string;
  customerId: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  planDurationMonths: number;
  status: SubscriptionStatus;
  notes?: string;
}
