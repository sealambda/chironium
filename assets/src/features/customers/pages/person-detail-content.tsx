import type { SubscriptionWithPerson } from "@/features/customers/api/subscriptions-api";
import type { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { AnthropometryCard } from "@/features/customers/ui/detail/anthropometry-card";
import { NutritionPlanSummaryCard } from "@/features/customers/ui/detail/nutrition-plan-summary-card";
import { PersonProfileCard } from "@/features/customers/ui/detail/person-profile-card";
import { SubscriptionCard } from "@/features/customers/ui/detail/subscription-card";

interface PersonDetailContentProps {
  item: SubscriptionWithPerson;
  detail: ReturnType<typeof usePersonDetail>;
}

export function PersonDetailContent({ item, detail }: Readonly<PersonDetailContentProps>) {
  const { currentSubscription, activeNutritionPlan, subscriptions, anthropometry, nutritionPlans } =
    detail;

  const latestSnapshot = anthropometry.data?.[0];

  return (
    <div className="space-y-4 lg:space-y-6">
      <PersonProfileCard item={item} />

      <SubscriptionCard subscription={currentSubscription} isLoading={subscriptions.isLoading} />

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <AnthropometryCard
          personId={item.subscriber.id}
          patientId={detail.patientId}
          history={anthropometry.data ?? []}
          isLoading={anthropometry.isLoading}
        />
        <NutritionPlanSummaryCard
          personId={item.subscriber.id}
          patientId={detail.patientId}
          plan={activeNutritionPlan}
          isLoading={nutritionPlans.isLoading}
          latestWeight={latestSnapshot?.weight}
          latestHeight={latestSnapshot?.height}
          birthDate={item.subscriber.birthDate ?? undefined}
          gender={item.subscriber.gender ?? undefined}
        />
      </div>
    </div>
  );
}
