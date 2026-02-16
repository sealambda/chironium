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
