import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { AddRecordDialog, type RecordType } from "@/features/customers/ui/detail/add-record-dialog";
import { PersonDetailHeader } from "@/features/customers/ui/detail/person-detail-header";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { Loading } from "@/shared/ui/loading";

import { PersonDetailContent } from "./person-detail-content";

// getRouteApi avoids importing the Route object from the route module, which would form a
// route<->page dependency cycle (the route lazy-loads this page).
const route = getRouteApi("/_app/customers_/$customerId");

// ─── Page component ─────────────────────────────────────────────────

/** Uses detail mode to replace standard navigation with a custom header. */
export function PersonDetailPage() {
  const { customerId } = route.useParams();

  const detail = usePersonDetail(customerId);
  const [addRecordOpen, setAddRecordOpen] = useState(false);
  const [activeRecordType, setActiveRecordType] = useState<RecordType | null>(null);
  const openAddRecord = useCallback(() => setAddRecordOpen(true), []);

  useDetailModeEffect(
    <PersonDetailHeader person={detail.person} personId={customerId} />,
    `customer-detail-${detail.person?.id ?? ""}-${String(detail.hasPatient)}`,
  );

  if (detail.isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-4 pt-4 lg:pt-6">
      <PersonDetailContent personId={customerId} detail={detail} openAddRecord={openAddRecord} />
      {detail.hasPatient ? (
        <AddRecordDialog
          personId={customerId}
          patientId={detail.patientId ?? null}
          open={addRecordOpen}
          onOpenChange={setAddRecordOpen}
          activeType={activeRecordType}
          onActiveTypeChange={setActiveRecordType}
          latestAnthropometry={detail.anthropometryHistory.data?.[0] ?? null}
          currentSubscription={detail.currentSubscription}
          dateOfBirth={detail.person?.birthDate ?? null}
          sex={detail.person?.gender ?? null}
        />
      ) : null}
    </div>
  );
}
