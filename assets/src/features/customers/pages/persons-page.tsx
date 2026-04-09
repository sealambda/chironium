import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { RowSelectionState } from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Building2,
  Plus,
  Search,
  Users,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useMemo, useState } from "react";

import {
  type CustomerListItem,
  fetchPersons,
  mergePersonsWithSubscriptions,
  type PersonListSortOption,
} from "@/features/customers/api/persons-api";
import { fetchSubscriptions } from "@/features/customers/api/subscriptions-api";
import {
  getStoredPersonSortPreference,
  storePersonSortPreference,
} from "@/features/customers/model/person-sort-preferences";
import { CustomerBulkActionBar } from "@/features/customers/ui/customer-bulk-action-bar";
import { CustomerTable } from "@/features/customers/ui/customer-table";
import { OnboardingDialog } from "@/features/customers/ui/onboarding/onboarding-dialog";
import { PersonCard } from "@/features/customers/ui/person-card";
import { ReassignCustomersDialog } from "@/features/customers/ui/reassign-customers-dialog";
import { useOrg } from "@/features/org/hooks/use-org";
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

/**
 * Customers page displaying a scrollable list of all persons, with subscription
 * data shown where available.
 */
export function CustomersPage() {
  const queryClient = useQueryClient();
  const { selectedOrg, loading: orgsLoading } = useOrg();
  const { setHeaderContent } = useDetailMode();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<PersonListSortOption>(
    () => getStoredPersonSortPreference() ?? "moreRecent",
  );

  const {
    data: persons,
    isLoading: personsLoading,
    error: personsError,
  } = useQuery({
    queryKey: ["customers", "persons", selectedOrg?.id, sortOption],
    queryFn: () => fetchPersons(selectedOrg?.id ?? "", sortOption),
    enabled: Boolean(selectedOrg),
    placeholderData: (previousData) => previousData,
  });

  const {
    data: subscriptions = [],
    isLoading: subscriptionsLoading,
    error: subscriptionsError,
  } = useQuery({
    queryKey: ["customers", "subscriptions", selectedOrg?.id],
    queryFn: () => fetchSubscriptions(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
  });

  const isLoading = (personsLoading && !persons) || subscriptionsLoading;
  const error = personsError ?? subscriptionsError;

  const customers = useMemo(
    () => mergePersonsWithSubscriptions(persons ?? [], subscriptions),
    [persons, subscriptions],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return customers;
    }
    return customers.filter((item) => formatPersonName(item.person.name).toLowerCase().includes(q));
  }, [customers, search]);

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

  useEffect(() => {
    if (!selectedOrg || isLoading || Boolean(error)) {
      setHeaderContent(null);
      return;
    }

    setHeaderContent(
      <div className="ml-auto flex w-full items-center justify-end gap-3">
        {customers.length > 0 ? (
          <div className="hidden w-72 sm:block">
            <ListSearchField
              value={search}
              onChange={setSearch}
              placeholder={m.customers_search_placeholder()}
            />
          </div>
        ) : null}
        <Button onClick={() => setOnboardingOpen(true)} data-testid="customers-new-button-header">
          <Plus className="size-4" data-icon="inline-start" />
          <span className="hidden md:inline">{m.customer_add()}</span>
        </Button>
      </div>,
    );

    return () => {
      setHeaderContent(null);
    };
  }, [customers.length, error, isLoading, search, selectedOrg, setHeaderContent]);

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
    <div className="space-y-4 pt-7">
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1
            className="font-bold text-foreground text-xl uppercase tracking-wide"
            data-testid="customers-heading"
          >
            {m.customers_title()}
          </h1>
          <span className="text-muted-foreground text-sm">({customers.length})</span>
        </div>
        {customers.length > 0 ? (
          <div className="flex items-center">
            <CustomerSortDropdown
              sortOption={sortOption}
              onSortOptionChange={handleSortOptionChange}
            />
          </div>
        ) : null}
      </header>

      {customers.length > 0 ? (
        <div className="sm:hidden">
          <ListSearchField
            value={search}
            onChange={setSearch}
            placeholder={m.customers_search_placeholder()}
          />
        </div>
      ) : null}

      <CustomerList
        items={filtered}
        isEmpty={customers.length === 0}
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
        onCompleted={() => {
          queryClient.invalidateQueries({ queryKey: ["customers"] });
        }}
      />

      <OnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </div>
  );
}

function CustomerList({
  items,
  isEmpty,
  onAdd,
  rowSelection,
  onRowSelectionChange,
}: Readonly<{
  items: CustomerListItem[];
  isEmpty: boolean;
  onAdd: () => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}>) {
  if (isEmpty) {
    return (
      <EmptyState
        icon={Users}
        title={m.customers_empty()}
        description={m.customers_empty_desc()}
        actionLabel={m.customer_add()}
        onAction={onAdd}
        actionTestId="customers-new-button-empty"
      />
    );
  }

  if (items.length === 0) {
    return <EmptyState icon={Search} title={m.customers_no_results()} />;
  }

  return (
    <div className="space-y-3">
      {/* Mobile: stacked cards with bulk selection */}
      <div className="space-y-3 lg:hidden">
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
}: Readonly<{
  sortOption: PersonListSortOption;
  onSortOptionChange: (sort: PersonListSortOption) => void;
}>) {
  const selectedSortLabel = getSortOptionLabel(sortOption);
  let SortIcon: typeof ArrowUpDownIcon;
  if (sortOption === "moreRecent") {
    SortIcon = ArrowDownIcon;
  } else if (sortOption === "lessRecent") {
    SortIcon = ArrowUpIcon;
  } else {
    SortIcon = ArrowUpDownIcon;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" type="button" />}>
        <SortIcon className="size-4" />
        {selectedSortLabel}
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

function RecentSortIcon({ sortOption }: Readonly<{ sortOption: PersonListSortOption }>) {
  if (sortOption === "moreRecent") {
    return <ArrowDownIcon className="ml-auto size-4 opacity-60" />;
  }
  if (sortOption === "lessRecent") {
    return <ArrowUpIcon className="ml-auto size-4 opacity-60" />;
  }
  return <ArrowUpDownIcon className="ml-auto size-4 opacity-60" />;
}

function GivenNameSortIcon({ sortOption }: Readonly<{ sortOption: PersonListSortOption }>) {
  if (sortOption === "givenNameDesc") {
    return <ArrowDownIcon className="ml-auto size-4 opacity-60" />;
  }
  if (sortOption === "givenNameAsc") {
    return <ArrowUpIcon className="ml-auto size-4 opacity-60" />;
  }
  return <ArrowUpDownIcon className="ml-auto size-4 opacity-60" />;
}

function FamilyNameSortIcon({ sortOption }: Readonly<{ sortOption: PersonListSortOption }>) {
  if (sortOption === "familyNameDesc") {
    return <ArrowDownIcon className="ml-auto size-4 opacity-60" />;
  }
  if (sortOption === "familyNameAsc") {
    return <ArrowUpIcon className="ml-auto size-4 opacity-60" />;
  }
  return <ArrowUpDownIcon className="ml-auto size-4 opacity-60" />;
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
