// TEMPORARY: Remove when backend implements subscription queries

import type { MutationError } from "./mutation-result";

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

export interface CreateSubscriptionInput {
  subscriberId: string;
  planId: string;
  startDate?: string;
}

export interface CreateSubscriptionResult {
  result: {
    id: string;
    startDate: string;
    state: string;
    subscriberId: string;
    planId: string;
  } | null;
  errors: MutationError[];
}
