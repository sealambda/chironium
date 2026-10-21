import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RowSelectionState } from "@tanstack/react-table";
import { Building2, ListFilterIcon, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchPersonIdsByPractitioner } from "@/features/customers/api/care-team-api";
import {
  fetchPersons,
  mergePersonsWithSubscriptions,
  type PersonAssignmentFilter,
  type PersonListSortOption,
} from "@/features/customers/api/persons-api";
import { fetchSubscriptions } from "@/features/customers/api/subscriptions-api";
import {
  hasCustomerListFilters,
  useCustomerListFiltering,
} from "@/features/customers/hooks/use-customer-list-filtering";
import {
  type CustomerListFilters,
  DEFAULT_CUSTOMER_LIST_FILTERS,
  getStoredCustomerListFilters,
  storeCustomerListFilters,
} from "@/features/customers/model/person-filter-preferences";
import {
  getStoredPersonSortPreference,
  storePersonSortPreference,
} from "@/features/customers/model/person-sort-preferences";
import { CustomerList } from "@/features/customers/pages/persons-page-list";
import { CustomerSortDropdown } from "@/features/customers/pages/persons-page-sort";
import { CustomerBulkActionBar } from "@/features/customers/ui/customer-bulk-action-bar";
import { CustomerFiltersDialog } from "@/features/customers/ui/filter-by-practitioner-dialog";
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
import { customersQueryKeys } from "@/shared/utils/query-keys";

function useCustomersPageData(
  orgId: string | undefined,
  sortOption: PersonListSortOption,
  listFilters: CustomerListFilters,
) {
  const personAssignmentFilter: PersonAssignmentFilter =
    listFilters.assignment?.kind === "unassigned" ? "unassigned" : "all";

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
      listFilters.assignment?.kind === "practitioner" ? listFilters.assignment.id : "",
    ),
    queryFn: () =>
      fetchPersonIdsByPractitioner(
        orgId ?? "",
        listFilters.assignment?.kind === "practitioner" ? listFilters.assignment.id : "",
      ),
    enabled: Boolean(orgId) && listFilters.assignment?.kind === "practitioner",
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
  const [listFilters, setListFilters] = useState<CustomerListFilters>(
    DEFAULT_CUSTOMER_LIST_FILTERS,
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<PersonListSortOption>(
    () => getStoredPersonSortPreference() ?? "moreRecent",
  );

  const { customers, isLoading, error, practitionerPersonIdSet } = useCustomersPageData(
    selectedOrg?.id,
    sortOption,
    listFilters,
  );

  const { filtered, hasActiveListFilters, hiddenByFiltersCount, hasSearchQuery, showListControls } =
    useCustomerListFiltering(customers, practitionerPersonIdSet, search, listFilters);

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

  const handleFiltersApply = (nextFilters: CustomerListFilters) => {
    if (selectedOrg?.id) {
      storeCustomerListFilters(selectedOrg.id, nextFilters);
    }

    setListFilters(nextFilters);
  };

  const handleClearFilters = () => {
    handleFiltersApply(DEFAULT_CUSTOMER_LIST_FILTERS);
  };

  const handleShowFinishedPlans = () => {
    handleFiltersApply({ ...listFilters, hideFinishedPlans: false });
  };

  useEffect(() => {
    if (!selectedOrg?.id) {
      setListFilters(DEFAULT_CUSTOMER_LIST_FILTERS);
      return;
    }

    setListFilters(getStoredCustomerListFilters(selectedOrg.id));
  }, [selectedOrg?.id]);

  useEffect(() => {
    if (!selectedOrg || isLoading || error) {
      setHeaderContent(null);
      return;
    }

    setHeaderContent(
      <div className="ml-auto flex w-full items-center justify-end gap-3">
        {showListControls ? (
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
  }, [error, isLoading, search, selectedOrg, setHeaderContent, showListControls]);

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
          <div className="text-sm text-muted-foreground">{message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-7">
      <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <h1
              className="text-xl font-bold tracking-wide text-foreground uppercase"
              data-testid="customers-heading"
            >
              {m.customers_title()}
            </h1>
            <span className="text-sm text-muted-foreground">({filtered.length})</span>
          </div>
          {hiddenByFiltersCount > 0 && !hasSearchQuery ? (
            <p className="text-sm text-muted-foreground">
              {m.customers_filters_hidden_count({ count: hiddenByFiltersCount })}
            </p>
          ) : null}
        </div>
        {showListControls ? (
          <div className="hidden items-center gap-2 sm:flex">
            <CustomerSortDropdown
              sortOption={sortOption}
              onSortOptionChange={handleSortOptionChange}
            />
            <CustomerFiltersButton listFilters={listFilters} onClick={() => setFilterOpen(true)} />
          </div>
        ) : null}
      </header>

      {showListControls ? (
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
          <CustomerFiltersButton
            listFilters={listFilters}
            onClick={() => setFilterOpen(true)}
            compact
          />
        </div>
      ) : null}

      <CustomerList
        items={filtered}
        isEmpty={customers.length === 0 && !hasActiveListFilters}
        filterEmptyState={
          filtered.length === 0 && !hasSearchQuery && hasActiveListFilters ? "filters" : "search"
        }
        hideFinishedPlans={listFilters.hideFinishedPlans}
        onAdd={() => setOnboardingOpen(true)}
        onClearFilters={handleClearFilters}
        onShowFinishedPlans={handleShowFinishedPlans}
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

      <CustomerFiltersDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        organizationId={selectedOrg.id}
        selectedFilters={listFilters}
        showUnassignedOption={canUseUnassignedFilter}
        onApply={handleFiltersApply}
      />

      <OnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </div>
  );
}

function formatFilterSummary(filters: CustomerListFilters): string {
  const parts: string[] = [];

  if (filters.assignment?.kind === "practitioner") {
    parts.push(filters.assignment.name);
  } else if (filters.assignment?.kind === "unassigned") {
    parts.push(m.customers_filter_unassigned());
  }

  if (filters.hideFinishedPlans) {
    parts.push(m.customers_filters_hide_finished());
  }

  return parts.join(", ");
}

function CustomerFiltersButton({
  listFilters,
  onClick,
  compact = false,
}: Readonly<{
  listFilters: CustomerListFilters;
  onClick: () => void;
  compact?: boolean;
}>) {
  const hasActiveFilters = hasCustomerListFilters(listFilters);
  const filterSummary = formatFilterSummary(listFilters);

  return (
    <Button
      variant={hasActiveFilters ? "secondary" : "outline"}
      size={compact ? "icon-sm" : "sm"}
      type="button"
      onClick={onClick}
      aria-label={
        hasActiveFilters
          ? m.customers_filters_active_aria({ summary: filterSummary })
          : m.customers_filters()
      }
      data-testid="customer-filters-button"
    >
      <ListFilterIcon data-icon="inline-start" aria-hidden />
      {compact ? null : <span>{m.customers_filters()}</span>}
    </Button>
  );
}
