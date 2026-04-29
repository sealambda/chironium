import { Activity, AlertCircle } from "lucide-react";

import type { AllergyIntoleranceItem } from "@/features/customers/api/allergy-intolerance-api";
import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";
import type { ConditionItem } from "@/features/customers/api/condition-api";
import type { FoodPreferenceHistoryItem } from "@/features/customers/api/food-preferences-api";
import type { GoalRecord } from "@/features/customers/api/goals-api";
import type { MedicationItem } from "@/features/customers/api/medications-api";
import { useActivityFeed } from "@/features/customers/hooks/use-activity-feed";
import type { FeedEventKind } from "@/features/customers/types/activity-feed";
import { CustomerDetailEmptyCardContent } from "@/features/customers/ui/detail/customer-detail-empty-card";
import * as m from "@/paraglide/messages";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";

import { ActivityFeedSkeleton } from "./activity-feed-skeleton";
import { ActivityFeedTimeline } from "./activity-feed-timeline";
import { FeedShowMore } from "./feed-show-more";

interface ActivityFeedCardProps {
  personId: string;
  patientId: string | null;
  organizationId: string;
  goals: GoalRecord[];
  subscriptions: SubscriptionRecord[];
  conditions: ConditionItem[];
  allergyIntolerances: AllergyIntoleranceItem[];
  medications: MedicationItem[];
  anthropometry: AnthropometricSnapshot[];
  foodPreferences: FoodPreferenceHistoryItem[];
  activeFilter: FeedEventKind | "all";
  personName?: string | null;
}

export function ActivityFeedCard({
  personId,
  patientId,
  organizationId,
  goals,
  subscriptions,
  conditions,
  allergyIntolerances,
  medications,
  anthropometry,
  foodPreferences,
  activeFilter,
  personName,
}: Readonly<ActivityFeedCardProps>) {
  const { groups, isLoading, isError, hasMore, showMore } = useActivityFeed({
    personId,
    patientId,
    organizationId,
    goals,
    subscriptions,
    conditions,
    allergyIntolerances,
    medications,
    anthropometry,
    foodPreferences,
    activeFilter,
    personName,
  });

  const isEmpty = !isLoading && !isError && groups.length === 0;

  let feedBody: React.JSX.Element;
  if (isLoading) {
    feedBody = <ActivityFeedSkeleton />;
  } else if (isError) {
    feedBody = (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
        <AlertCircle className="size-4 shrink-0 text-destructive" aria-hidden />
        <p className="text-destructive text-sm">{m.activity_error()}</p>
      </div>
    );
  } else if (isEmpty) {
    feedBody = (
      <CustomerDetailEmptyCardContent
        icon={Activity}
        title={m.activity_empty()}
        description={m.activity_empty_desc()}
      />
    );
  } else {
    feedBody = (
      <>
        <ActivityFeedTimeline groups={groups} personId={personId} />
        <FeedShowMore hasMore={hasMore} onShowMore={showMore} />
      </>
    );
  }

  return (
    <section aria-live="polite" aria-busy={isLoading}>
      {feedBody}
    </section>
  );
}
