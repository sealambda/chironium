import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Building2,
  Plus,
  Search,
  Stethoscope,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useOrg } from "@/features/org/hooks/use-org";
import {
  applyPractitionerListSort,
  type PractitionerListSortOption,
} from "@/features/practitioners/api/practitioner-list-sort";
import {
  fetchPractitionersList,
  type Practitioner,
} from "@/features/practitioners/api/practitioners-api";
import {
  getStoredPractitionerSortPreference,
  storePractitionerSortPreference,
} from "@/features/practitioners/model/practitioner-sort-preferences";
import { CreatePractitionerDialog } from "@/features/practitioners/ui/create-practitioner-dialog";
import { PractitionerCard } from "@/features/practitioners/ui/practitioner-card";
import { PractitionerTable } from "@/features/practitioners/ui/practitioner-table";
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
import { ListSearchField } from "@/shared/ui/list-search-field";
import { Loading } from "@/shared/ui/loading";
import { formatPersonName } from "@/shared/utils/person-utils";

/**
 * Lists organization practitioners with search, sort, and creation (for authorized roles).
 */
export function PractitionersPage() {
  const { selectedOrg, loading: orgsLoading } = useOrg();
  const { setHeaderContent } = useDetailMode();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<PractitionerListSortOption>(
    () => getStoredPractitionerSortPreference() ?? "moreRecent",
  );

  const {
    data: practitionerRows,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["practitioners", selectedOrg?.id],
    queryFn: () => fetchPractitionersList(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
    placeholderData: (previousData) => previousData,
  });

  const practitioners = useMemo(
    () => applyPractitionerListSort(practitionerRows ?? [], sortOption),
    [practitionerRows, sortOption],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return practitioners;
    }
    return practitioners.filter((p) => formatPersonName(p.name).toLowerCase().includes(q));
  }, [practitioners, search]);

  const handleSortOptionChange = (next: PractitionerListSortOption) => {
    storePractitionerSortPreference(next);
    setSortOption(next);
  };

  useEffect(() => {
    if (!selectedOrg || (isLoading && !practitionerRows) || Boolean(error)) {
      setHeaderContent(null);
      return;
    }

    setHeaderContent(
      <div className="ml-auto flex w-full items-center justify-end gap-3">
        {practitionerRows && practitionerRows.length > 0 ? (
          <div className="hidden w-72 sm:block">
            <ListSearchField
              value={search}
              onChange={setSearch}
              placeholder={m.practitioners_search_placeholder()}
            />
          </div>
        ) : null}
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" data-icon="inline-start" />
          <span className="hidden md:inline">{m.practitioner_add()}</span>
        </Button>
      </div>,
    );

    return () => {
      setHeaderContent(null);
    };
  }, [error, isLoading, practitionerRows, search, selectedOrg, setHeaderContent]);

  if (orgsLoading || (selectedOrg && isLoading && !practitionerRows)) {
    return <Loading />;
  }

  if (!selectedOrg) {
    return <EmptyState icon={Building2} title={m.no_org()} description={m.no_org_desc()} />;
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch practitioners";
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-destructive">{m.practitioners_error()}</div>
          <div className="text-muted-foreground text-sm">{message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-7">
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-bold text-foreground text-xl uppercase tracking-wide">
            {m.practitioners_title()}
          </h1>
          <span className="text-muted-foreground text-sm">({practitioners.length})</span>
        </div>
        {practitioners.length > 0 ? (
          <div className="flex items-center">
            <PractitionersSortDropdown
              sortOption={sortOption}
              onSortOptionChange={handleSortOptionChange}
            />
          </div>
        ) : null}
      </header>

      {practitioners.length > 0 ? (
        <div className="sm:hidden">
          <ListSearchField
            value={search}
            onChange={setSearch}
            placeholder={m.practitioners_search_placeholder()}
          />
        </div>
      ) : null}

      <PractitionerList
        items={filtered}
        isEmpty={practitioners.length === 0}
        onAdd={() => setCreateOpen(true)}
      />

      <CreatePractitionerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={selectedOrg.id}
      />
    </div>
  );
}

function PractitionerList({
  items,
  isEmpty,
  onAdd,
}: Readonly<{
  items: Practitioner[];
  isEmpty: boolean;
  onAdd: () => void;
}>) {
  if (isEmpty) {
    return (
      <EmptyState
        icon={Stethoscope}
        title={m.practitioners_empty()}
        description={m.practitioners_empty_desc()}
        actionLabel={m.practitioner_add()}
        onAction={onAdd}
      />
    );
  }

  if (items.length === 0) {
    return <EmptyState icon={Search} title={m.practitioners_no_results()} />;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3 lg:hidden">
        {items.map((p) => (
          <div key={p.id} className="block">
            <PractitionerCard practitioner={p} />
          </div>
        ))}
      </div>

      <div className="hidden lg:block">
        <PractitionerTable items={items} />
      </div>
    </div>
  );
}

function PractitionersSortDropdown({
  sortOption,
  onSortOptionChange,
}: Readonly<{
  sortOption: PractitionerListSortOption;
  onSortOptionChange: (sort: PractitionerListSortOption) => void;
}>) {
  const selectedSortLabel = getPractitionerSortOptionLabel(sortOption);
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
        <DropdownMenuLabel>{m.practitioners_sort_by()}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onSortOptionChange(getNextRecentSort(sortOption))}>
          {m.practitioners_sort_recent()}
          <RecentSortIcon sortOption={sortOption} />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSortOptionChange(getNextGivenNameSort(sortOption))}>
          {m.practitioners_sort_given_name()}
          <GivenNameSortIcon sortOption={sortOption} />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSortOptionChange(getNextFamilyNameSort(sortOption))}>
          {m.practitioners_sort_family_name()}
          <FamilyNameSortIcon sortOption={sortOption} />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSortOptionChange(getNextBirthDateSort(sortOption))}>
          {m.practitioners_sort_birth_date()}
          <BirthDateSortIcon sortOption={sortOption} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecentSortIcon({ sortOption }: Readonly<{ sortOption: PractitionerListSortOption }>) {
  if (sortOption === "moreRecent") {
    return <ArrowDownIcon className="ml-auto size-4 opacity-60" />;
  }
  if (sortOption === "lessRecent") {
    return <ArrowUpIcon className="ml-auto size-4 opacity-60" />;
  }
  return <ArrowUpDownIcon className="ml-auto size-4 opacity-60" />;
}

function GivenNameSortIcon({ sortOption }: Readonly<{ sortOption: PractitionerListSortOption }>) {
  if (sortOption === "givenNameDesc") {
    return <ArrowDownIcon className="ml-auto size-4 opacity-60" />;
  }
  if (sortOption === "givenNameAsc") {
    return <ArrowUpIcon className="ml-auto size-4 opacity-60" />;
  }
  return <ArrowUpDownIcon className="ml-auto size-4 opacity-60" />;
}

function FamilyNameSortIcon({ sortOption }: Readonly<{ sortOption: PractitionerListSortOption }>) {
  if (sortOption === "familyNameDesc") {
    return <ArrowDownIcon className="ml-auto size-4 opacity-60" />;
  }
  if (sortOption === "familyNameAsc") {
    return <ArrowUpIcon className="ml-auto size-4 opacity-60" />;
  }
  return <ArrowUpDownIcon className="ml-auto size-4 opacity-60" />;
}

function BirthDateSortIcon({ sortOption }: Readonly<{ sortOption: PractitionerListSortOption }>) {
  if (sortOption === "birthDateDesc") {
    return <ArrowDownIcon className="ml-auto size-4 opacity-60" />;
  }
  if (sortOption === "birthDateAsc") {
    return <ArrowUpIcon className="ml-auto size-4 opacity-60" />;
  }
  return <ArrowUpDownIcon className="ml-auto size-4 opacity-60" />;
}

function getPractitionerSortOptionLabel(sortOption: PractitionerListSortOption): string {
  if (sortOption === "moreRecent") {
    return m.practitioners_sort_more_recent();
  }
  if (sortOption === "lessRecent") {
    return m.practitioners_sort_less_recent();
  }
  if (sortOption === "givenNameAsc") {
    return m.practitioners_sort_given_name_asc();
  }
  if (sortOption === "givenNameDesc") {
    return m.practitioners_sort_given_name_desc();
  }
  if (sortOption === "familyNameAsc") {
    return m.practitioners_sort_family_name_asc();
  }
  if (sortOption === "familyNameDesc") {
    return m.practitioners_sort_family_name_desc();
  }
  if (sortOption === "birthDateAsc") {
    return m.practitioners_sort_birth_date_asc();
  }
  return m.practitioners_sort_birth_date_desc();
}

function getNextRecentSort(sortOption: PractitionerListSortOption): PractitionerListSortOption {
  if (sortOption === "moreRecent") {
    return "lessRecent";
  }
  return "moreRecent";
}

function getNextGivenNameSort(sortOption: PractitionerListSortOption): PractitionerListSortOption {
  if (sortOption === "givenNameAsc") {
    return "givenNameDesc";
  }
  return "givenNameAsc";
}

function getNextFamilyNameSort(sortOption: PractitionerListSortOption): PractitionerListSortOption {
  if (sortOption === "familyNameAsc") {
    return "familyNameDesc";
  }
  return "familyNameAsc";
}

function getNextBirthDateSort(sortOption: PractitionerListSortOption): PractitionerListSortOption {
  if (sortOption === "birthDateAsc") {
    return "birthDateDesc";
  }
  return "birthDateAsc";
}
