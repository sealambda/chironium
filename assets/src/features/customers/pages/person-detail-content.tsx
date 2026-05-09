import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, UserPlus } from "lucide-react";
import { type ReactNode, useState } from "react";

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

  const [activeFilter, setActiveFilter] = useState<FeedEventKind | "all">("all");

  return (
    <div className="flex flex-col gap-10 pb-10">
      {/* Mini-dashboard: clinical summary cards in a responsive grid */}
      <Section title={m.clinical_summary()} collapsible>
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-10">
          <div className="lg:order-1 lg:col-span-3">
            <AnthropometryCard
              personId={personId}
              patientId={patientId}
              history={anthropometryEntries}
              isLoading={anthropometryHistory.isLoading}
              compact
            />
          </div>
          <div className="lg:order-4 lg:col-span-3">
            <MenstrualCycleCard
              personId={personId}
              patientId={patientId}
              cycle={menstrualCycleData}
              isLoading={menstrualCycle.isLoading}
              compact
            />
          </div>
          <div className="lg:order-2 lg:col-span-3">
            <ConditionsCard
              items={personConditions}
              isLoading={conditions.isLoading}
              compact
              personId={personId}
              organizationId={organizationId}
            />
          </div>
          <div className="lg:order-5 lg:col-span-3">
            <MedicationsCard
              items={personMedications}
              isLoading={medications.isLoading}
              compact
              personId={personId}
              organizationId={organizationId}
            />
          </div>
          <div className="lg:order-3 lg:col-span-4">
            <AllergyIntoleranceCard
              items={personAllergyIntolerances}
              isLoading={allergyIntolerances.isLoading}
              compact
              personId={personId}
              patientId={patientId}
              organizationId={organizationId}
            />
          </div>
          <div className="lg:order-6 lg:col-span-4">
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
        <div className="pb-0.5">
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
          anthropometry={anthropometryEntries}
          foodPreferences={foodPreferenceEntries}
          observations={observationEntries}
          menstrualCycles={menstrualCycleEntries}
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
