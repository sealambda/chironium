export type CustomerSubscriptionStatus = "active" | "paused" | "expired" | "cancelled";

export interface CustomerSubscription {
  id: string;
  startDate: string;
  endDate: string;
  planDurationMonths: number;
  status: CustomerSubscriptionStatus;
}
