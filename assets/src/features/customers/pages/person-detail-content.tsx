import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";

import { createPatientForPerson } from "@/features/customers/api/patients-api";
import type { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { AllergyIntoleranceCard } from "@/features/customers/ui/detail/allergy-intolerance-card";
import { AnthropometryCard } from "@/features/customers/ui/detail/anthropometry-card";
import { FoodPreferencesCard } from "@/features/customers/ui/detail/food-preferences-card";
import { GoalsCard } from "@/features/customers/ui/detail/goals-card";
import { MenstrualCycleCard } from "@/features/customers/ui/detail/menstrual-cycle-card";
import { NutritionPlanSummaryCard } from "@/features/customers/ui/detail/nutrition-plan-summary-card";
import { ObservationsCard } from "@/features/customers/ui/detail/observations-card";
import { PersonProfileCard } from "@/features/customers/ui/detail/person-profile-card";
import { SubscriptionCard } from "@/features/customers/ui/detail/subscription-card";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";

interface PersonDetailContentProps {
  personId: string;
  detail: ReturnType<typeof usePersonDetail>;
}

export function PersonDetailContent({ personId, detail }: Readonly<PersonDetailContentProps>) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const {
    person,
    hasPatient,
    patientId,
    currentSubscription,
    activeNutritionPlan,
    subscriptions,
    anthropometry,
    nutritionPlans,
    goals,
    observations,
    menstrualCycle,
    foodPreferences,
    allergyIntolerances,
  } = detail;

  const { mutate: createPatient, isPending } = useMutation({
    mutationFn: () => createPatientForPerson(personId, selectedOrg?.id ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["person", personId, "patient-detail"],
      });
    },
  });

  const latestSnapshot = anthropometry.data?.[0];

  return (
    <div className="space-y-4 lg:space-y-6">
      {person ? <PersonProfileCard person={person} /> : null}

      {hasPatient ? (
        <>
          <div className="mx-auto w-full max-w-3xl">
            <GoalsCard
              personId={personId}
              patientId={patientId}
              goals={goals.data ?? []}
              isLoading={goals.isLoading}
            />
          </div>

          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
            <AnthropometryCard
              personId={personId}
              patientId={patientId}
              history={anthropometry.data ?? []}
              isLoading={anthropometry.isLoading}
            />
            <NutritionPlanSummaryCard
              personId={personId}
              patientId={patientId}
              plan={activeNutritionPlan}
              isLoading={nutritionPlans.isLoading}
              latestWeight={latestSnapshot?.weight}
              latestHeight={latestSnapshot?.height}
              birthDate={person?.birthDate ?? undefined}
              gender={person?.gender ?? undefined}
            />
          </div>

          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
            <FoodPreferencesCard
              personId={personId}
              patientId={patientId}
              included={foodPreferences.data?.included ?? []}
              excluded={foodPreferences.data?.excluded ?? []}
              isLoading={foodPreferences.isLoading}
            />
            <AllergyIntoleranceCard
              personId={personId}
              patientId={patientId}
              items={allergyIntolerances.data ?? []}
              isLoading={allergyIntolerances.isLoading}
            />
          </div>

          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
            <MenstrualCycleCard
              cycle={menstrualCycle.data ?? null}
              isLoading={menstrualCycle.isLoading}
            />
            <ObservationsCard
              personId={personId}
              patientId={patientId}
              observations={observations.data ?? null}
              isLoading={observations.isLoading}
            />
          </div>

          <SubscriptionCard
            subscription={currentSubscription}
            isLoading={subscriptions.isLoading}
          />
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border border-dashed p-8 text-center">
          <UserPlus className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">{m.customer_create_patient()}</p>
            <p className="mt-1 text-muted-foreground text-sm">{m.customer_create_patient_desc()}</p>
          </div>
          <Button onClick={() => createPatient()} disabled={isPending}>
            {isPending ? m.common_saving() : m.customer_create_patient()}
          </Button>
        </div>
      )}
    </div>
  );
}
