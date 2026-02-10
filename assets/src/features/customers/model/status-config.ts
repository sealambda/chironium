/**
 * Centralized status configurations for customer-related components.
 */

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface StatusConfig {
  label?: string;
  variant: BadgeVariant;
}

export const subscriptionStatusConfig: Record<string, StatusConfig> = {
  active: { label: "Active", variant: "default" },
  paused: { label: "Paused", variant: "outline" },
  expired: { label: "Expired", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export const pathologyStatusConfig: Record<string, StatusConfig> = {
  active: { variant: "destructive" },
  chronic: { variant: "outline" },
  resolved: { variant: "secondary" },
};

export const customerStatusConfig: Record<string, StatusConfig> = {
  "up-to-date": { label: "Up to date", variant: "default" },
  "needs-attention": { label: "Needs attention", variant: "secondary" },
  overdue: { label: "Overdue", variant: "destructive" },
};
