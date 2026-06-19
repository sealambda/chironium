import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, UserPlus } from "lucide-react";
import { type ReactNode, useState } from "react";

import { selectCurrentStateSnapshot } from "@/features/customers/api/anthropometry-api";
import type { GoalRecord } from "@/features/customers/api/goals-api";
import { createPatientForPerson } from "@/features/customers/api/patients-api";
import type { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import type { FeedEventKind } from "@/features/customers/types/activity-feed";
import { ActivityFeedCard } from "@/features/customers/ui/detail/activity-feed/activity-feed-card";
import { FeedFilterChips } from "@/features/customers/ui/detail/activity-feed/feed-filter-chips";
import { AddRecordButton } from "@/features/customers/ui/detail/add-record-button";
import { AllergyIntoleranceCard } from "@/features/customers/ui/detail/allergy-intolerance-card";
import { AnthropometryCard } from "@/features/customers/ui/detail/anthropometry-card";
import { ConditionsCard } from "@/features/customers/ui/detail/conditions-card";
import { FoodPreferencesCard } from "@/features/customers/ui/detail/food-preferences-card";
import { MedicationsCard } from "@/features/customers/ui/detail/medications-card";
import { MenstrualCycleCard } from "@/features/customers/ui/detail/menstrual-cycle-card";
import { NutritionCard } from "@/features/customers/ui/detail/nutrition-card";
import { PrescriptionsCard } from "@/features/customers/ui/detail/prescriptions-card";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";
import { Button } from "@/shared/ui/button";
import { formatPersonName } from "@/shared/utils/person-utils";

interface SectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

function Section({
  title,
  action,
  children,
  collapsible = false,
  defaultExpanded = true,
}: Readonly<SectionProps>) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex h-8 items-center justify-between px-1">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="flex cursor-pointer items-center gap-1.5"
            aria-expanded={isExpanded}
          >
            <h2 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">
              {title}
            </h2>
            {isExpanded ? (
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            )}
          </button>
        ) : (
          <h2 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">
            {title}
          </h2>
        )}
        {action}
      </div>
      {isExpanded ? children : null}
    </section>
  );
}

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

/** Derives the patient's latest demographics and renders the nutrition card. */
function PatientNutritionCard({
  detail,
  personId,
  patientId,
  organizationId,
}: Readonly<{
  detail: ReturnType<typeof usePersonDetail>;
  personId: string;
  patientId: string | null;
  organizationId: string;
}>) {
  const { person, anthropometryHistory, nutritionPlans } = detail;
  const current = selectCurrentStateSnapshot(anthropometryHistory.data ?? []);
  return (
    <NutritionCard
      plans={nutritionPlans.data}
      isLoading={nutritionPlans.isLoading}
      compact
      personId={personId}
      patientId={patientId}
      organizationId={organizationId}
      weightKg={current?.weight ?? null}
      heightCm={current?.height ?? null}
      dateOfBirth={person?.birthDate ?? null}
      sex={person?.gender ?? null}
    />
  );
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
    medicationRequests,
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
  const personMedicationRequests = medicationRequests.data ?? [];
  const anthropometryEntries = anthropometryHistory.data ?? [];
  const foodPreferenceEntries = foodPreferencesHistory.data ?? [];
  const menstrualCycleData = menstrualCycle.data ?? null;
  const menstrualCycleEntries = menstrualCycleHistory.data ?? [];
  const observationEntries = observationsList.data;

  const [activeFilter, setActiveFilter] = useState<FeedEventKind | "all">("all");

  return (
    <div className="flex flex-col gap-10 pb-10">
      {/* Mini-dashboard: clinical summary cards in a responsive grid */}
      <Section title={m.clinical_summary()} collapsible>
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:order-1 lg:order-0">
            <AnthropometryCard
              history={anthropometryEntries}
              isLoading={anthropometryHistory.isLoading}
              compact
            />
          </div>
          <div className="sm:order-2 lg:order-0">
            <MenstrualCycleCard
              personId={personId}
              patientId={patientId}
              cycle={menstrualCycleData}
              isLoading={menstrualCycle.isLoading}
              compact
            />
          </div>
          <div className="sm:order-3 sm:col-span-2 lg:order-0 lg:col-span-1">
            <PatientNutritionCard
              detail={detail}
              personId={personId}
              patientId={patientId}
              organizationId={organizationId}
            />
          </div>
          <div className="sm:order-4 lg:order-0">
            <ConditionsCard
              items={personConditions}
              isLoading={conditions.isLoading}
              compact
              personId={personId}
              organizationId={organizationId}
            />
          </div>
          <div className="sm:order-7 sm:col-span-2 lg:order-0 lg:col-span-2">
            <AllergyIntoleranceCard
              items={personAllergyIntolerances}
              isLoading={allergyIntolerances.isLoading}
              compact
              personId={personId}
              patientId={patientId}
              organizationId={organizationId}
            />
          </div>
          <div className="sm:order-5 lg:order-0">
            <MedicationsCard
              items={personMedications}
              isLoading={medications.isLoading}
              compact
              personId={personId}
              organizationId={organizationId}
            />
          </div>
          <div className="sm:order-6 sm:col-span-2 lg:order-0 lg:col-span-1">
            <PrescriptionsCard
              items={personMedicationRequests}
              isLoading={medicationRequests.isLoading}
              compact
              personId={personId}
              organizationId={organizationId}
            />
          </div>
          <div className="sm:order-8 sm:col-span-2 lg:order-0 lg:col-span-2">
            <FoodPreferencesCard
              history={foodPreferencesHistory.data ?? []}
              isLoading={foodPreferencesHistory.isLoading}
              compact
              personId={personId}
              organizationId={organizationId}
            />
          </div>
        </div>
      </Section>

      {/* Activity feed — full width below the mini-dashboard */}
      <Section
        title={m.activity_title()}
        action={
          openAddRecord == null ? null : <AddRecordButton onClick={openAddRecord} compactOnMobile />
        }
      >
        <div className="min-w-0 pb-0.5">
          <FeedFilterChips active={activeFilter} onChange={setActiveFilter} />
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
          medicationRequests={personMedicationRequests}
          anthropometry={anthropometryEntries}
          foodPreferences={foodPreferenceEntries}
          observations={observationEntries}
          menstrualCycles={menstrualCycleEntries}
          nutritionPlans={detail.nutritionPlans.data}
          activeFilter={activeFilter}
          personName={person?.name ? formatPersonName(person.name) : null}
          openAddRecord={openAddRecord}
        />
      </Section>
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
