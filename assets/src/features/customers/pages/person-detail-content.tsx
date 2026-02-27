import type { SubscriptionWithPerson } from "@/features/customers/api/subscriptions-api";
import type { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { AllergyIntoleranceCard } from "@/features/customers/ui/detail/allergy-intolerance-card";
import { AnthropometryCard } from "@/features/customers/ui/detail/anthropometry-card";
import { FoodPreferencesCard } from "@/features/customers/ui/detail/food-preferences-card";
import { GoalsCard } from "@/features/customers/ui/detail/goals-card";
import { NutritionPlanSummaryCard } from "@/features/customers/ui/detail/nutrition-plan-summary-card";
import { ObservationsCard } from "@/features/customers/ui/detail/observations-card";
import { PersonProfileCard } from "@/features/customers/ui/detail/person-profile-card";
import { SubscriptionCard } from "@/features/customers/ui/detail/subscription-card";

interface PersonDetailContentProps {
  item: SubscriptionWithPerson;
  detail: ReturnType<typeof usePersonDetail>;
}

export function PersonDetailContent({ item, detail }: Readonly<PersonDetailContentProps>) {
  const {
    currentSubscription,
    activeNutritionPlan,
    subscriptions,
    anthropometry,
    nutritionPlans,
    goals,
    observations,
    foodPreferences,
    allergyIntolerances,
  } = detail;

  const latestSnapshot = anthropometry.data?.[0];

  return (
    <div className="space-y-4 lg:space-y-6">
      <PersonProfileCard item={item} />

      <GoalsCard
        personId={item.subscriber.id}
        patientId={detail.patientId}
        goals={goals.data ?? []}
        isLoading={goals.isLoading}
      />

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

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <FoodPreferencesCard
          personId={item.subscriber.id}
          patientId={detail.patientId}
          included={foodPreferences.data?.included ?? []}
          excluded={foodPreferences.data?.excluded ?? []}
          isLoading={foodPreferences.isLoading}
        />
        <AllergyIntoleranceCard
          personId={item.subscriber.id}
          patientId={detail.patientId}
          items={allergyIntolerances.data ?? []}
          isLoading={allergyIntolerances.isLoading}
        />
      </div>

      <ObservationsCard
        personId={item.subscriber.id}
        patientId={detail.patientId}
        observations={observations.data ?? null}
        isLoading={observations.isLoading}
      />

      <SubscriptionCard subscription={currentSubscription} isLoading={subscriptions.isLoading} />
    </div>
  );
}
