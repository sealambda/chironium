import type { LucideIcon } from "lucide-react";
import { Activity, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import type { AllergyIntoleranceItem } from "@/features/customers/api/allergy-intolerance-api";
import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";
import type { ConditionItem } from "@/features/customers/api/condition-api";
import type { FoodPreferenceHistoryItem } from "@/features/customers/api/food-preferences-api";
import type { GoalRecord } from "@/features/customers/api/goals-api";
import type { MedicationRequestItem } from "@/features/customers/api/medication-requests-api";
import type { MedicationItem } from "@/features/customers/api/medications-api";
import type { NutritionPlanRecord } from "@/features/customers/api/nutrition-plans-api";
import type {
  MenstrualCycleEntry,
  ObservationsPage,
} from "@/features/customers/api/observations-api";
import { useActivityFeed } from "@/features/customers/hooks/use-activity-feed";
import type { FeedEventKind } from "@/features/customers/types/activity-feed";
import { AddRecordButton } from "@/features/customers/ui/detail/add-record-button";
import * as m from "@/paraglide/messages";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";

import { ActivityFeedSkeleton } from "./activity-feed-skeleton";
import { ActivityFeedTimeline } from "./activity-feed-timeline";
import { FeedShowMore } from "./feed-show-more";

interface ActivityFeedEmptyCardContentProps {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly description: ReactNode;
  readonly onAdd?: () => void;
}

function ActivityFeedEmptyCardContent({
  icon: Icon,
  title,
  description,
  onAdd,
}: Readonly<ActivityFeedEmptyCardContentProps>) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <Icon className="size-10 shrink-0 text-muted-foreground/60" aria-hidden />
      <div className="text-center">
        <p className="font-medium text-foreground text-sm">{title}</p>
        <p className="mt-0.5 text-foreground/65 text-xs">{description}</p>
      </div>
      {onAdd == null ? null : <AddRecordButton onClick={onAdd} />}
    </div>
  );
}

interface ActivityFeedCardProps {
  personId: string;
  patientId: string | null;
  organizationId: string;
  goals: GoalRecord[];
  subscriptions: SubscriptionRecord[];
  conditions: ConditionItem[];
  allergyIntolerances: AllergyIntoleranceItem[];
  medications: MedicationItem[];
  medicationRequests: MedicationRequestItem[];
  anthropometry: AnthropometricSnapshot[];
  foodPreferences: FoodPreferenceHistoryItem[];
  observations: ObservationsPage;
  menstrualCycles: MenstrualCycleEntry[];
  nutritionPlans: NutritionPlanRecord[];
  activeFilter: FeedEventKind | "all";
  personName?: string | null;
  openAddRecord?: () => void;
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
  medicationRequests,
  anthropometry,
  foodPreferences,
  observations,
  menstrualCycles,
  nutritionPlans,
  activeFilter,
  personName,
  openAddRecord,
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
    medicationRequests,
    anthropometry,
    foodPreferences,
    observations,
    menstrualCycles,
    nutritionPlans,
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
      <ActivityFeedEmptyCardContent
        icon={Activity}
        title={m.activity_empty()}
        description={m.activity_empty_desc()}
        onAdd={openAddRecord}
      />
    );
  } else {
    feedBody = (
      <>
        <ActivityFeedTimeline
          groups={groups}
          personId={personId}
          patientId={patientId}
          organizationId={organizationId}
          currentSubscriptionId={subscriptions[0]?.id ?? null}
        />
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
