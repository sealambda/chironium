import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Building2,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  type CustomerListItem,
  fetchPersons,
  mergePersonsWithSubscriptions,
  type PersonListSortOption,
} from "@/features/customers/api/persons-api";
import {
  getStoredPersonSortPreference,
  storePersonSortPreference,
} from "@/features/customers/model/person-sort-preferences";
import { fetchSubscriptions } from "@/features/customers/api/subscriptions-api";
import { CustomerTable } from "@/features/customers/ui/customer-table";
import { OnboardingDialog } from "@/features/customers/ui/onboarding/onboarding-dialog";
import { PersonCard } from "@/features/customers/ui/person-card";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { useDetailMode } from "@/shared/layout/detail-context";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { EmptyState } from "@/shared/ui/empty-state";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { formatPersonName } from "@/shared/utils/person-utils";

/**
 * Customers page displaying a scrollable list of all persons, with subscription
 * data shown where available.
 */
export function CustomersPage() {
  const { selectedOrg, loading: orgsLoading } = useOrg();
  const { setHeaderContent } = useDetailMode();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
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
            <CustomerSearchInput value={search} onChange={setSearch} />
          </div>
        ) : null}
        <Button onClick={() => setOnboardingOpen(true)}>
          <Plus className="size-4" data-icon="inline-start" />
          <span className="hidden md:inline">{m.customer_add()}</span>
        </Button>
      </div>,
    );

    return () => {
      setHeaderContent(null);
    };
  }, [customers.length, error, isLoading, search, selectedOrg, setHeaderContent]);

  if (orgsLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">{m.common_loading()}</div>
        </div>
      </div>
    );
  }

  if (!selectedOrg) {
    return (
      <EmptyState
        icon={Building2}
        title={m.customers_no_org()}
        description={m.customers_no_org_desc()}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">{m.common_loading()}</div>
        </div>
      </div>
    );
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
          <h1 className="font-bold text-2xl text-foreground uppercase tracking-wide">
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
          <CustomerSearchInput value={search} onChange={setSearch} />
        </div>
      ) : null}

      <CustomerList
        items={filtered}
        isEmpty={customers.length === 0}
        onAdd={() => setOnboardingOpen(true)}
      />

      <OnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </div>
  );
}

function CustomerSearchInput({
  value,
  onChange,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        placeholder={m.customers_search_placeholder()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </InputGroup>
  );
}

function CustomerList({
  items,
  isEmpty,
  onAdd,
}: Readonly<{
  items: CustomerListItem[];
  isEmpty: boolean;
  onAdd: () => void;
}>) {
  if (isEmpty) {
    return (
      <EmptyState
        icon={Users}
        title={m.customers_empty()}
        description={m.customers_empty_desc()}
        actionLabel={m.customer_add()}
        onAction={onAdd}
      />
    );
  }

  if (items.length === 0) {
    return <EmptyState icon={Search} title={m.customers_no_results()} />;
  }

  return (
    <div className="space-y-3">
      {/* Mobile: stacked cards */}
      <div className="space-y-3 lg:hidden">
        {items.map((item) => (
          <Link
            key={item.person.id}
            to="/customers/$customerId"
            params={{ customerId: item.person.id }}
            className="block"
          >
            <PersonCard item={item} />
          </Link>
        ))}
      </div>

      {/* Desktop: data table */}
      <div className="hidden lg:block">
        <CustomerTable items={items} />
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
