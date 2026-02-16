// TEMPORARY: Remove when backend implements subscription queries

export type SubscriptionState = "active" | "suspended" | "expired" | "canceled";

export interface SubscriptionPlan {
  id: string;
  name: string;
  periodDuration: string;
}

export interface Subscriber {
  id: string;
  name?: string | null;
  contactPoints?: Array<{
    type?: string | null;
    value?: string | null;
  }> | null;
}

export interface Subscription {
  id: string;
  state?: SubscriptionState | null;
  startDate: string;
  subscriber: Subscriber;
  plan: SubscriptionPlan;
  subscriberId?: string;
  planId?: string;
}
