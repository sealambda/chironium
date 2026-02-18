import type { SubscriptionWithPerson } from "@/features/customers/api/subscriptions-api";
import type { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { BiometricSummaryCard } from "@/features/customers/ui/detail/biometric-summary-card";
import { NutritionPlanSummaryCard } from "@/features/customers/ui/detail/nutrition-plan-summary-card";
import { PersonProfileCard } from "@/features/customers/ui/detail/person-profile-card";
import { SubscriptionCard } from "@/features/customers/ui/detail/subscription-card";

interface PersonDetailContentProps {
  item: SubscriptionWithPerson;
  detail: ReturnType<typeof usePersonDetail>;
}

export function PersonDetailContent({ item, detail }: Readonly<PersonDetailContentProps>) {
  const { currentSubscription, activeNutritionPlan, subscriptions, bodyMetrics, nutritionPlans } =
    detail;

  return (
    <div className="space-y-4 lg:space-y-6">
      <PersonProfileCard item={item} />

      <SubscriptionCard subscription={currentSubscription} isLoading={subscriptions.isLoading} />

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <BiometricSummaryCard history={bodyMetrics.data ?? []} isLoading={bodyMetrics.isLoading} />
        <NutritionPlanSummaryCard plan={activeNutritionPlan} isLoading={nutritionPlans.isLoading} />
      </div>
    </div>
  );
}
