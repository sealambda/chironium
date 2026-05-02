import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, UserPlus } from "lucide-react";
import { useState } from "react";

import type { GoalRecord } from "@/features/customers/api/goals-api";
import { createPatientForPerson } from "@/features/customers/api/patients-api";
import type { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import type { FeedEventKind } from "@/features/customers/types/activity-feed";
import { ActivityFeedCard } from "@/features/customers/ui/detail/activity-feed/activity-feed-card";
import { FeedFilterChips } from "@/features/customers/ui/detail/activity-feed/feed-filter-chips";
import { AllergyIntoleranceCard } from "@/features/customers/ui/detail/allergy-intolerance-card";
import { AnthropometryCard } from "@/features/customers/ui/detail/anthropometry-card";
import { ConditionsCard } from "@/features/customers/ui/detail/conditions-card";
import { FoodPreferencesCard } from "@/features/customers/ui/detail/food-preferences-card";
import { MedicationsCard } from "@/features/customers/ui/detail/medications-card";
import { MenstrualCycleCard } from "@/features/customers/ui/detail/menstrual-cycle-card";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";
import { Button } from "@/shared/ui/button";
import { formatPersonName } from "@/shared/utils/person-utils";

// Stable empty-array references to avoid re-creating on every render.
const EMPTY_GOALS: GoalRecord[] = [];
const EMPTY_SUBSCRIPTIONS: SubscriptionRecord[] = [];

interface PersonDetailContentProps {
  personId: string;
  detail: ReturnType<typeof usePersonDetail>;
  openAddRecord?: () => void;
}

interface PatientDetailCardsProps {
  personId: string;
  patientId: string | null;
  detail: ReturnType<typeof usePersonDetail>;
  organizationId: string;
  openAddRecord?: () => void;
}

function PatientDetailCards({
  personId,
  patientId,
  detail,
  organizationId,
  openAddRecord,
}: Readonly<PatientDetailCardsProps>) {
  const {
    person,
    anthropometryHistory,
    goals,
    subscriptions,
    conditions,
    allergyIntolerances,
    medications,
    foodPreferencesHistory,
    menstrualCycle,
    menstrualCycleHistory,
    observationsList,
  } = detail;
  const personGoals = goals.data ?? EMPTY_GOALS;
  const personSubscriptions = subscriptions.data ?? EMPTY_SUBSCRIPTIONS;
  const personConditions = conditions.data ?? [];
  const personAllergyIntolerances = allergyIntolerances.data ?? [];
  const personMedications = medications.data ?? [];
  const anthropometryEntries = anthropometryHistory.data ?? [];
  const foodPreferenceEntries = foodPreferencesHistory.data ?? [];
  const menstrualCycleData = menstrualCycle.data ?? null;
  const menstrualCycleEntries = menstrualCycleHistory.data ?? [];
  const observationEntries = observationsList.data;

  const [activeFilter, setFilter] = useState<FeedEventKind | "all">("all");

  return (
    <div className="flex flex-col gap-6">
      {/* Mini-dashboard: clinical summary cards in a responsive grid */}
      <section aria-label={m.clinical_summary()}>
        <div className="mb-3 flex h-8 items-center px-1">
          <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            {m.clinical_summary()}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnthropometryCard
            history={anthropometryEntries}
            isLoading={anthropometryHistory.isLoading}
            birthDate={person?.birthDate}
            gender={person?.gender}
            compact
          />
          <ConditionsCard
            items={personConditions}
            isLoading={conditions.isLoading}
            compact
            personId={personId}
            organizationId={organizationId}
          />
          <MedicationsCard
            items={personMedications}
            isLoading={medications.isLoading}
            compact
            personId={personId}
            organizationId={organizationId}
          />
          <MenstrualCycleCard
            cycle={menstrualCycleData}
            isLoading={menstrualCycle.isLoading}
            compact
          />
          <AllergyIntoleranceCard
            items={personAllergyIntolerances}
            isLoading={allergyIntolerances.isLoading}
            compact
            personId={personId}
            patientId={patientId}
            organizationId={organizationId}
          />
          <FoodPreferencesCard
            history={foodPreferencesHistory.data ?? []}
            isLoading={foodPreferencesHistory.isLoading}
            compact
            personId={personId}
            organizationId={organizationId}
          />
        </div>
      </section>

      {/* Activity feed — full width below the mini-dashboard */}
      <div className="flex flex-col gap-3">
        <div className="flex h-8 items-center justify-between px-1">
          <h2 className="font-semibold text-foreground/70 text-sm uppercase tracking-widest">
            {m.activity_title()}
          </h2>
          {openAddRecord != null ? (
            <Button
              size="sm"
              onClick={openAddRecord}
              aria-label={m.add_record_title()}
              className="gap-1.5"
            >
              <Plus data-icon="inline-start" aria-hidden />
              <span className="hidden lg:inline">{m.add_record_title()}</span>
            </Button>
          ) : null}
        </div>
        <div className="pb-0.5">
          <FeedFilterChips active={activeFilter} onChange={setFilter} />
        </div>
        <ActivityFeedCard
          personId={personId}
          patientId={patientId}
          organizationId={organizationId}
          goals={personGoals}
          subscriptions={personSubscriptions}
          conditions={personConditions}
          allergyIntolerances={personAllergyIntolerances}
          medications={personMedications}
          anthropometry={anthropometryEntries}
          foodPreferences={foodPreferenceEntries}
          observations={observationEntries}
          menstrualCycles={menstrualCycleEntries}
          activeFilter={activeFilter}
          personName={person?.name ? formatPersonName(person.name) : null}
        />
      </div>
    </div>
  );
}

export function PersonDetailContent({
  personId,
  detail,
  openAddRecord,
}: Readonly<PersonDetailContentProps>) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const { hasPatient, patientId } = detail;

  const { mutate: createPatient, isPending } = useMutation({
    mutationFn: () => createPatientForPerson(personId, selectedOrg?.id ?? ""),
    onSuccess: () => invalidatePersonDetail(queryClient, personId),
  });

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {hasPatient ? (
        <PatientDetailCards
          personId={personId}
          patientId={patientId}
          detail={detail}
          organizationId={selectedOrg?.id ?? ""}
          openAddRecord={openAddRecord}
        />
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
