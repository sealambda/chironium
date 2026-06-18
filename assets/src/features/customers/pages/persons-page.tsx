import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RowSelectionState } from "@tanstack/react-table";
import { Building2, ListFilterIcon, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchPersonIdsByPractitioner } from "@/features/customers/api/care-team-api";
import {
  type CustomerListItem,
  fetchPersons,
  mergePersonsWithSubscriptions,
  type PersonAssignmentFilter,
  type PersonListSortOption,
} from "@/features/customers/api/persons-api";
import { fetchSubscriptions } from "@/features/customers/api/subscriptions-api";
import {
  getStoredPersonFilterPreference,
  storePersonFilterPreference,
} from "@/features/customers/model/person-filter-preferences";
import {
  getStoredPersonSortPreference,
  storePersonSortPreference,
} from "@/features/customers/model/person-sort-preferences";
import { CustomerList } from "@/features/customers/pages/persons-page-list";
import { CustomerSortDropdown } from "@/features/customers/pages/persons-page-sort";
import { CustomerBulkActionBar } from "@/features/customers/ui/customer-bulk-action-bar";
import { FilterByPractitionerDialog } from "@/features/customers/ui/filter-by-practitioner-dialog";
import { OnboardingDialog } from "@/features/customers/ui/onboarding/onboarding-dialog";
import { ReassignCustomersDialog } from "@/features/customers/ui/reassign-customers-dialog";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import * as m from "@/paraglide/messages";
import { useDetailMode } from "@/shared/layout/detail-context";
import { useCurrentUser } from "@/shared/session/use-current-user";
import { useOrg } from "@/shared/session/use-org";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ListSearchField } from "@/shared/ui/list-search-field";
import { Loading } from "@/shared/ui/loading";
import { formatPersonName } from "@/shared/utils/person-utils";
import { customersQueryKeys } from "@/shared/utils/query-keys";

interface PractitionerFilter {
  kind: "practitioner";
  id: string;
  name: string;
}

interface UnassignedFilter {
  kind: "unassigned";
}

type CustomerAssignmentFilter = PractitionerFilter | UnassignedFilter | null;

function useCustomersPageData(
  orgId: string | undefined,
  sortOption: PersonListSortOption,
  assignmentFilter: CustomerAssignmentFilter,
) {
  const personAssignmentFilter: PersonAssignmentFilter =
    assignmentFilter?.kind === "unassigned" ? "unassigned" : "all";

  const {
    data: persons,
    isLoading: personsLoading,
    error: personsError,
  } = useQuery({
    queryKey: customersQueryKeys.persons(orgId ?? "", sortOption, personAssignmentFilter),
    queryFn: () => fetchPersons(orgId ?? "", sortOption, personAssignmentFilter),
    enabled: Boolean(orgId),
    placeholderData: (previousData) => previousData,
  });

  const {
    data: subscriptions = [],
    isLoading: subscriptionsLoading,
    error: subscriptionsError,
  } = useQuery({
    queryKey: customersQueryKeys.subscriptions(orgId ?? ""),
    queryFn: () => fetchSubscriptions(orgId ?? ""),
    enabled: Boolean(orgId),
  });

  const { data: practitionerPersonIds } = useQuery({
    queryKey: customersQueryKeys.practitionerPersonIds(
      orgId ?? "",
      assignmentFilter?.kind === "practitioner" ? assignmentFilter.id : "",
    ),
    queryFn: () =>
      fetchPersonIdsByPractitioner(
        orgId ?? "",
        assignmentFilter?.kind === "practitioner" ? assignmentFilter.id : "",
      ),
    enabled: Boolean(orgId) && assignmentFilter?.kind === "practitioner",
  });

  const isLoading = (personsLoading && !persons) || subscriptionsLoading;
  const error = personsError ?? subscriptionsError;

  const customers = useMemo(
    () => mergePersonsWithSubscriptions(persons ?? [], subscriptions),
    [persons, subscriptions],
  );

  const practitionerPersonIdSet = useMemo(
    () => (practitionerPersonIds ? new Set(practitionerPersonIds) : null),
    [practitionerPersonIds],
  );

  return { customers, isLoading, error, practitionerPersonIdSet };
}

/**
 * Customers page displaying a scrollable list of all persons, with subscription
 * data shown where available.
 */
export function CustomersPage() {
  const queryClient = useQueryClient();
  const { selectedOrg, loading: orgsLoading } = useOrg();
  const { user } = useCurrentUser();
  const { setHeaderContent } = useDetailMode();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState<CustomerAssignmentFilter>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<PersonListSortOption>(
    () => getStoredPersonSortPreference() ?? "moreRecent",
  );

  const { customers, isLoading, error, practitionerPersonIdSet } = useCustomersPageData(
    selectedOrg?.id,
    sortOption,
    assignmentFilter,
  );

  const filtered = useMemo(
    () => filterCustomers(customers, practitionerPersonIdSet, search),
    [customers, practitionerPersonIdSet, search],
  );

  const canUseUnassignedFilter = useMemo(() => {
    if (!selectedOrg || !user) {
      return false;
    }

    if (selectedOrg.ownerId === user.id) {
      return true;
    }

    return selectedOrg.organizationUsers.some(
      (organizationUser) =>
        organizationUser.userId === user.id && organizationUser.role === "POWER_USER",
    );
  }, [selectedOrg, user]);

  const selectedPersonIds = useMemo(
    () =>
      Object.entries(rowSelection)
        .filter(([, selected]) => selected)
        .map(([id]) => id),
    [rowSelection],
  );

  const handleSortOptionChange = (nextSortOption: PersonListSortOption) => {
    storePersonSortPreference(nextSortOption);
    setSortOption(nextSortOption);
  };

  const handleReassignCompleted = () => {
    const orgId = selectedOrg?.id ?? "";
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: customersQueryKeys.personsPrefix(orgId),
      }),
      queryClient.invalidateQueries({
        queryKey: customersQueryKeys.subscriptions(orgId),
      }),
      queryClient.invalidateQueries({
        queryKey: customersQueryKeys.practitionerPersonIdsPrefix(orgId),
      }),
      ...selectedPersonIds.map((personId) => invalidatePersonDetail(queryClient, personId)),
    ]);
  };

  const handleFilterApply = (nextFilter: CustomerAssignmentFilter) => {
    if (selectedOrg?.id) {
      storePersonFilterPreference(selectedOrg.id, nextFilter);
    }

    setAssignmentFilter(nextFilter);
  };

  useEffect(() => {
    if (!selectedOrg?.id) {
      setAssignmentFilter(null);
      return;
    }

    setAssignmentFilter(getStoredPersonFilterPreference(selectedOrg.id));
  }, [selectedOrg?.id]);

  useEffect(() => {
    if (!selectedOrg || isLoading || error) {
      setHeaderContent(null);
      return;
    }

    setHeaderContent(
      <div className="ml-auto flex w-full items-center justify-end gap-3">
        {customers.length > 0 || assignmentFilter !== null ? (
          <div className="hidden w-72 sm:block">
            <ListSearchField
              value={search}
              onChange={setSearch}
              placeholder={m.customers_search_placeholder()}
            />
          </div>
        ) : null}
        <Button onClick={() => setOnboardingOpen(true)} data-testid="customers-new-button-header">
          <Plus data-icon="inline-start" aria-hidden />
          <span className="hidden md:inline">{m.customer_add()}</span>
        </Button>
      </div>,
    );

    return () => {
      setHeaderContent(null);
    };
  }, [assignmentFilter, customers.length, error, isLoading, search, selectedOrg, setHeaderContent]);

  if (orgsLoading || (selectedOrg && isLoading)) {
    return <Loading />;
  }

  if (!selectedOrg) {
    return <EmptyState icon={Building2} title={m.no_org()} description={m.no_org_desc()} />;
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch customers";
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-destructive">{m.customers_error()}</div>
          <div className="text-muted-foreground text-sm">{message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-7">
      <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2">
          <h1
            className="font-bold text-foreground text-xl uppercase tracking-wide"
            data-testid="customers-heading"
          >
            {m.customers_title()}
          </h1>
          <span className="text-muted-foreground text-sm">({customers.length})</span>
        </div>
        {customers.length > 0 || assignmentFilter !== null ? (
          <div className="hidden items-center gap-2 sm:flex">
            <CustomerSortDropdown
              sortOption={sortOption}
              onSortOptionChange={handleSortOptionChange}
            />
            <PractitionerFilterButton
              assignmentFilter={assignmentFilter}
              onClick={() => setFilterOpen(true)}
            />
          </div>
        ) : null}
      </header>

      {customers.length > 0 || assignmentFilter !== null ? (
        <div className="flex items-center gap-2 sm:hidden">
          <div className="min-w-0 flex-1">
            <ListSearchField
              value={search}
              onChange={setSearch}
              placeholder={m.customers_search_placeholder()}
            />
          </div>
          <CustomerSortDropdown
            sortOption={sortOption}
            onSortOptionChange={handleSortOptionChange}
            compact
          />
          <PractitionerFilterButton
            assignmentFilter={assignmentFilter}
            onClick={() => setFilterOpen(true)}
            compact
          />
        </div>
      ) : null}

      <CustomerList
        items={filtered}
        isEmpty={customers.length === 0 && assignmentFilter === null}
        onAdd={() => setOnboardingOpen(true)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      <CustomerBulkActionBar
        selectedCount={selectedPersonIds.length}
        onReassign={() => setReassignOpen(true)}
        onClear={() => setRowSelection({})}
      />

      <ReassignCustomersDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        organizationId={selectedOrg.id}
        selectedPersonIds={selectedPersonIds}
        onCompleted={handleReassignCompleted}
      />

      <FilterByPractitionerDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        organizationId={selectedOrg.id}
        selectedFilter={assignmentFilter}
        showUnassignedOption={canUseUnassignedFilter}
        onApply={handleFilterApply}
      />

      <OnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </div>
  );
}

function filterCustomers(
  customers: CustomerListItem[],
  practitionerPersonIdSet: Set<string> | null,
  search: string,
): CustomerListItem[] {
  let result = customers;

  if (practitionerPersonIdSet) {
    result = result.filter((item) => practitionerPersonIdSet.has(item.person.id));
  }

  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter((item) => formatPersonName(item.person.name).toLowerCase().includes(q));
  }

  return result;
}

function PractitionerFilterButton({
  assignmentFilter,
  onClick,
  compact = false,
}: Readonly<{
  assignmentFilter: CustomerAssignmentFilter;
  onClick: () => void;
  compact?: boolean;
}>) {
  let buttonLabel: string = m.customers_filter_by_practitioner();
  if (assignmentFilter?.kind === "practitioner") {
    buttonLabel = assignmentFilter.name;
  } else if (assignmentFilter?.kind === "unassigned") {
    buttonLabel = m.customers_filter_unassigned();
  }

  return (
    <Button
      variant={assignmentFilter ? "secondary" : "outline"}
      size={compact ? "icon-sm" : "sm"}
      type="button"
      onClick={onClick}
      aria-label={
        assignmentFilter
          ? m.customers_filter_by_practitioner_active_aria({
              name: buttonLabel,
            })
          : m.customers_filter_by_practitioner()
      }
      data-testid="filter-practitioner-button"
    >
      <ListFilterIcon data-icon="inline-start" aria-hidden />
      {compact ? null : <span>{buttonLabel}</span>}
    </Button>
  );
}
