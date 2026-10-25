import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";

import type { PersonListSortOption } from "@/features/customers/api/persons-api";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export function CustomerSortDropdown({
  sortOption,
  onSortOptionChange,
}: Readonly<{
  sortOption: PersonListSortOption;
  onSortOptionChange: (sort: PersonListSortOption) => void;
}>) {
  const selectedSortLabel = getSortOptionLabel(sortOption);
  const SortIcon = getSortTriggerIcon(sortOption);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" type="button" />}>
        <SortIcon data-icon="inline-start" aria-hidden />
        <span className="sr-only sm:not-sr-only">{selectedSortLabel}</span>
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
