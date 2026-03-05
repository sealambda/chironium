import { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { PersonDetailHeader } from "@/features/customers/ui/detail/person-detail-header";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId";
import { useDetailModeEffect } from "@/shared/layout/detail-context";

import { PersonDetailContent } from "./person-detail-content";

// ─── Page component ─────────────────────────────────────────────────

/** Uses detail mode to replace standard navigation with a custom header. */
export function PersonDetailPage() {
  const { customerId } = Route.useParams();

  const detail = usePersonDetail(customerId);

  useDetailModeEffect(
    <PersonDetailHeader person={detail.person} />,
    `customer-detail-${detail.person?.id ?? ""}`,
  );

  if (detail.isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">{m.common_loading()}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      <PersonDetailContent personId={customerId} detail={detail} />
    </div>
  );
}
