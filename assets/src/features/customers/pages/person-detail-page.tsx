import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { fetchSubscriptionsWithPerson } from "@/features/customers/api/subscriptions-api";
import { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { PersonDetailHeader } from "@/features/customers/ui/detail/person-detail-header";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { Button } from "@/shared/ui/button";

import { PersonDetailContent } from "./person-detail-content";

// ─── Page component ─────────────────────────────────────────────────

/** Uses detail mode to replace standard navigation with a custom header. */
export function PersonDetailPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();

  // Likely cached from the customers list page.
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "list", selectedOrg?.id],
    queryFn: () => fetchSubscriptionsWithPerson(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
  });

  const item = customers.find((c) => c.subscriber.id === customerId);
  const detail = usePersonDetail(customerId);

  useDetailModeEffect(<PersonDetailHeader />, "customer-detail");

  if (detail.isLoading && !item) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">{m.common_loading()}</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-4">
        <div className="text-center">
          <div className="mb-2 font-medium text-destructive">{m.customer_not_found()}</div>
          <div className="text-muted-foreground text-sm">{m.customer_not_found_desc()}</div>
        </div>
        <Link to="/customers">
          <Button variant="outline">{m.customer_back()}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      <PersonDetailContent item={item} detail={detail} />
    </div>
  );
}
