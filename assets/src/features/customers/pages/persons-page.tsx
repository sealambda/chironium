import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { RowSelectionState } from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Building2,
  ListFilterIcon,
  Plus,
  Search,
  Users,
} from "lucide-react";
import type * as React from "react";
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
import { CustomerBulkActionBar } from "@/features/customers/ui/customer-bulk-action-bar";
import { CustomerTable } from "@/features/customers/ui/customer-table";
import { CustomerFiltersDialog } from "@/features/customers/ui/filter-by-practitioner-dialog";
import { OnboardingDialog } from "@/features/customers/ui/onboarding/onboarding-dialog";
import { PersonCard } from "@/features/customers/ui/person-card";
import { ReassignCustomersDialog } from "@/features/customers/ui/reassign-customers-dialog";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
import { useDetailMode } from "@/shared/layout/detail-context";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { EmptyState } from "@/shared/ui/empty-state";
import { ListSearchField } from "@/shared/ui/list-search-field";
import { Loading } from "@/shared/ui/loading";
import { formatPersonName } from "@/shared/utils/person-utils";
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
      queryClient.invalidateQueries({ queryKey: customersQueryKeys.personsPrefix(orgId) }),
      queryClient.invalidateQueries({ queryKey: customersQueryKeys.subscriptions(orgId) }),
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
          <div className="text-muted-foreground text-sm">{message}</div>
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
              className="font-bold text-foreground text-xl uppercase tracking-wide"
              data-testid="customers-heading"
            >
              {m.customers_title()}
            </h1>
            <span className="text-muted-foreground text-sm">({filtered.length})</span>
          </div>
          {hiddenByFiltersCount > 0 && !hasSearchQuery ? (
            <p className="text-muted-foreground text-sm">
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

function CustomerList({
  items,
  isEmpty,
  filterEmptyState,
  hideFinishedPlans,
  onAdd,
  onClearFilters,
  onShowFinishedPlans,
  rowSelection,
  onRowSelectionChange,
}: Readonly<{
  items: CustomerListItem[];
  isEmpty: boolean;
  filterEmptyState: "search" | "filters";
  hideFinishedPlans: boolean;
  onAdd: () => void;
  onClearFilters: () => void;
  onShowFinishedPlans: () => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}>) {
  if (isEmpty) {
    return (
      <EmptyState
        icon={Users}
        title={m.customers_empty()}
        description={m.customers_empty_desc()}
        actions={[
          {
            label: m.customer_add(),
            testId: "customers-new-button-empty",
            onAction: onAdd,
          },
        ]}
      />
    );
  }

  if (items.length === 0) {
    if (filterEmptyState === "filters") {
      const actions = [
        {
          label: m.customers_filters_clear(),
          testId: "customers-clear-filters-button",
          onAction: onClearFilters,
        },
      ];

      if (hideFinishedPlans) {
        actions.push({
          label: m.customers_filters_show_finished(),
          testId: "customers-show-finished-plans-button",
          onAction: onShowFinishedPlans,
        });
      }

      return (
        <EmptyState icon={Search} title={m.customers_filters_no_active_plans()} actions={actions} />
      );
    }

    return <EmptyState icon={Search} title={m.customers_no_results()} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile: stacked cards with bulk selection */}
      <div className="flex flex-col gap-3 lg:hidden">
        {items.map((item) => {
          const id = item.person.id;
          const name = formatPersonName(item.person.name);
          return (
            <div key={id} className="relative">
              <Checkbox
                aria-label={m.customers_select_row_aria({ name })}
                checked={Boolean(rowSelection[id])}
                className="absolute top-4 right-4 z-10"
                onCheckedChange={(value) => {
                  const selected = Boolean(value);
                  onRowSelectionChange((prev) => {
                    if (selected) {
                      return { ...prev, [id]: true };
                    }
                    const next = { ...prev };
                    delete next[id];
                    return next;
                  });
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <Link
                to="/customers/$customerId"
                params={{ customerId: id }}
                className="block min-w-0"
              >
                <PersonCard item={item} />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Desktop: data table */}
      <div className="hidden lg:block">
        <CustomerTable
          items={items}
          rowSelection={rowSelection}
          onRowSelectionChange={onRowSelectionChange}
        />
      </div>
    </div>
  );
}

function CustomerSortDropdown({
  sortOption,
  onSortOptionChange,
  compact = false,
}: Readonly<{
  sortOption: PersonListSortOption;
  onSortOptionChange: (sort: PersonListSortOption) => void;
  compact?: boolean;
}>) {
  const selectedSortLabel = getSortOptionLabel(sortOption);
  const SortIcon = getSortTriggerIcon(sortOption);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size={compact ? "icon-sm" : "sm"} type="button" />}
      >
        <SortIcon data-icon="inline-start" aria-hidden />
        <span className={compact ? "sr-only" : undefined}>{selectedSortLabel}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{m.customers_sort_by()}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onSortOptionChange(getNextRecentSort(sortOption))}>
          {m.customers_sort_recent()}
          <RecentSortIcon sortOption={sortOption} />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSortOptionChange(getNextGivenNameSort(sortOption))}>
          {m.customers_sort_given_name()}
          <GivenNameSortIcon sortOption={sortOption} />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSortOptionChange(getNextFamilyNameSort(sortOption))}>
          {m.customers_sort_family_name()}
          <FamilyNameSortIcon sortOption={sortOption} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getSortTriggerIcon(sortOption: PersonListSortOption): typeof ArrowUpDownIcon {
  if (
    sortOption === "moreRecent" ||
    sortOption === "givenNameDesc" ||
    sortOption === "familyNameDesc"
  ) {
    return ArrowDownIcon;
  }

  if (
    sortOption === "lessRecent" ||
    sortOption === "givenNameAsc" ||
    sortOption === "familyNameAsc"
  ) {
    return ArrowUpIcon;
  }

  return ArrowUpDownIcon;
}

function RecentSortIcon({ sortOption }: Readonly<{ sortOption: PersonListSortOption }>) {
  if (sortOption === "moreRecent") {
    return <ArrowDownIcon className="ml-auto opacity-60" aria-hidden />;
  }
  if (sortOption === "lessRecent") {
    return <ArrowUpIcon className="ml-auto opacity-60" aria-hidden />;
  }
  return <ArrowUpDownIcon className="ml-auto opacity-60" aria-hidden />;
}

function GivenNameSortIcon({ sortOption }: Readonly<{ sortOption: PersonListSortOption }>) {
  if (sortOption === "givenNameDesc") {
    return <ArrowDownIcon className="ml-auto opacity-60" aria-hidden />;
  }
  if (sortOption === "givenNameAsc") {
    return <ArrowUpIcon className="ml-auto opacity-60" aria-hidden />;
  }
  return <ArrowUpDownIcon className="ml-auto opacity-60" aria-hidden />;
}

function FamilyNameSortIcon({ sortOption }: Readonly<{ sortOption: PersonListSortOption }>) {
  if (sortOption === "familyNameDesc") {
    return <ArrowDownIcon className="ml-auto opacity-60" aria-hidden />;
  }
  if (sortOption === "familyNameAsc") {
    return <ArrowUpIcon className="ml-auto opacity-60" aria-hidden />;
  }
  return <ArrowUpDownIcon className="ml-auto opacity-60" aria-hidden />;
}

function getSortOptionLabel(sortOption: PersonListSortOption): string {
  if (sortOption === "moreRecent") {
    return m.customers_sort_more_recent();
  }
  if (sortOption === "lessRecent") {
    return m.customers_sort_less_recent();
  }
  if (sortOption === "givenNameAsc") {
    return m.customers_sort_given_name_asc();
  }
  if (sortOption === "givenNameDesc") {
    return m.customers_sort_given_name_desc();
  }
  if (sortOption === "familyNameAsc") {
    return m.customers_sort_family_name_asc();
  }
  return m.customers_sort_family_name_desc();
}

function getNextRecentSort(sortOption: PersonListSortOption): PersonListSortOption {
  if (sortOption === "moreRecent") {
    return "lessRecent";
  }
  return "moreRecent";
}

function getNextGivenNameSort(sortOption: PersonListSortOption): PersonListSortOption {
  if (sortOption === "givenNameAsc") {
    return "givenNameDesc";
  }
  return "givenNameAsc";
}

function getNextFamilyNameSort(sortOption: PersonListSortOption): PersonListSortOption {
  if (sortOption === "familyNameAsc") {
    return "familyNameDesc";
  }
  return "familyNameAsc";
}
