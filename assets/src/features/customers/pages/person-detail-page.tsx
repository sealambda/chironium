import { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { PersonDetailHeader } from "@/features/customers/ui/detail/person-detail-header";
import { Route } from "@/routes/_app/customers_.$customerId";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { Loading } from "@/shared/ui/loading";

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
    return <Loading />;
  }

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      <PersonDetailContent personId={customerId} detail={detail} />
    </div>
  );
}
