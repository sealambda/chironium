import type { ColumnDef } from "@tanstack/react-table";

import type { SubscriptionPlan } from "@/features/customers/api/subscriptions-api";
import * as m from "@/paraglide/messages";

function formatDurationCode(code: string | null | undefined): string {
  if (!code) {
    return "—";
  }
  switch (code) {
    case "D":
      return m.duration_days();
    case "WK":
      return m.duration_weeks();
    case "MO":
      return m.duration_months();
    case "A":
      return m.duration_years();
    default:
      return code;
  }
}

/** Human-readable duration and price lines for mobile plan cards. */
export function formatSubscriptionPlanDurationText(plan: SubscriptionPlan): string {
  const { duration } = plan;
  if (!duration?.value) {
    return "—";
  }
  return `${duration.value} ${formatDurationCode(duration.code)}`;
}

export function formatSubscriptionPlanPriceText(plan: SubscriptionPlan): string {
  const money = plan.priceAmount;
  if (!money?.amount) {
    return "—";
  }
  return `${money.amount} ${money.currency}`;
}

export const subscriptionPlanColumns: ColumnDef<SubscriptionPlan, unknown>[] = [
  {
    id: "name",
    enableSorting: false,
    accessorFn: (row) => row.name ?? "",
    header: () => m.subscriptions_col_name(),
    cell: ({ getValue }) => {
      const name = getValue() as string;
      return <span className="font-medium">{name || "—"}</span>;
    },
  },
  {
    id: "duration",
    enableSorting: false,
    header: () => m.subscriptions_col_duration(),
    cell: ({ row }) => {
      const { duration } = row.original;
      if (!duration?.value) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <span className="text-muted-foreground">
          {duration.value} {formatDurationCode(duration.code)}
        </span>
      );
    },
  },
  {
    id: "price",
    enableSorting: false,
    header: () => m.subscriptions_col_price(),
    cell: ({ row }) => {
      const money = row.original.priceAmount;
      if (!money?.amount) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <span className="text-muted-foreground">
          {money.amount} {money.currency}
        </span>
      );
    },
  },
];
