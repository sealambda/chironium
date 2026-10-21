import { useMemo } from "react";

import type { CustomerListItem } from "@/features/customers/api/persons-api";
import type { CustomerListFilters } from "@/features/customers/model/person-filter-preferences";
import { isSubscriptionFinished } from "@/features/customers/utils/subscription-finished";
import { formatPersonName } from "@/shared/utils/person-utils";

export function hasCustomerListFilters(filters: CustomerListFilters): boolean {
  return filters.assignment !== null || filters.hideFinishedPlans;
}

function filterCustomers(
  customers: CustomerListItem[],
  practitionerPersonIdSet: Set<string> | null,
  search: string,
  listFilters: CustomerListFilters,
): CustomerListItem[] {
  let result = customers;

  if (practitionerPersonIdSet) {
    result = result.filter((item) => practitionerPersonIdSet.has(item.person.id));
  }

  if (listFilters.hideFinishedPlans) {
    result = result.filter((item) => !isSubscriptionFinished(item.subscription));
  }

  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter((item) => formatPersonName(item.person.name).toLowerCase().includes(q));
  }

  return result;
}

export function useCustomerListFiltering(
  customers: CustomerListItem[],
  practitionerPersonIdSet: Set<string> | null,
  search: string,
  listFilters: CustomerListFilters,
) {
  const hasActiveListFilters = hasCustomerListFilters(listFilters);
  const filteredWithoutSearch = useMemo(
    () => filterCustomers(customers, practitionerPersonIdSet, "", listFilters),
    [customers, listFilters, practitionerPersonIdSet],
  );
  const filtered = useMemo(
    () => filterCustomers(customers, practitionerPersonIdSet, search, listFilters),
    [customers, listFilters, practitionerPersonIdSet, search],
  );
  const hiddenByFiltersCount = hasActiveListFilters
    ? customers.length - filteredWithoutSearch.length
    : 0;
  const hasSearchQuery = search.trim().length > 0;
  const showListControls = customers.length > 0 || hasActiveListFilters;

  return {
    filtered,
    filteredWithoutSearch,
    hasActiveListFilters,
    hiddenByFiltersCount,
    hasSearchQuery,
    showListControls,
  };
}
