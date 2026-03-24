import type { SubscriptionPlan } from "@/features/customers/api/subscriptions-api";
import { DataTable } from "@/shared/ui/data-table";

import { subscriptionPlanColumns } from "./subscription-plan-columns";

interface SubscriptionPlansTableProps {
  items: SubscriptionPlan[];
}

export function SubscriptionPlansTable({ items }: Readonly<SubscriptionPlansTableProps>) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <DataTable columns={subscriptionPlanColumns} data={items} getRowId={(row) => row.id} />
    </div>
  );
}
