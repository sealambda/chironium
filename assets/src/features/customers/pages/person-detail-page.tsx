import { useCallback, useState } from "react";

import { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { AddRecordDialog, type RecordType } from "@/features/customers/ui/detail/add-record-dialog";
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
        />
      ) : null}
    </div>
  );
}
