/**
 * Status type for customers based on subscription state.
 * - "up-to-date": Active subscription, everything is fine
 * - "needs-attention": Subscription needs action (e.g., suspended)
 * - "overdue": Subscription expired or canceled
 */
export type CustomerStatus = "up-to-date" | "needs-attention" | "overdue";

/**
 * Customer interface representing a subscriber with subscription and contact info.
 * This is the canonical type used throughout the customers feature.
 */
export interface Customer {
  id: string;
  name: string;
  initials: string;
  status: CustomerStatus;
  subscription: {
    startDate: Date;
    planDurationMonths: number;
    endDate: Date;
  };
  contact: {
    email?: string;
    phone?: string;
    instagram?: string;
  };
}

/**
 * Action types for customer-related tasks and reminders.
 */
export type CustomerActionType =
  | "report_sent"
  | "report_received"
  | "review_sent"
  | "review_received";

/**
 * Customer action representing a scheduled or completed task.
 */
export interface CustomerAction {
  id: string;
  type: CustomerActionType;
  dueDate: Date;
  completedDate?: Date;
  assignedTo: "customer" | "team";
}
