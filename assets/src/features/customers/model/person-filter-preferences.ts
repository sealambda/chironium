const PERSON_FILTER_PREFERENCE_KEY = "chironium_customer_assignment_filter";

interface StoredPractitionerFilter {
  kind: "practitioner";
  id: string;
  name: string;
}

interface StoredUnassignedFilter {
  kind: "unassigned";
}

type StoredAssignmentFilter = StoredPractitionerFilter | StoredUnassignedFilter | null;

export interface CustomerListFilters {
  assignment: StoredAssignmentFilter;
  hideFinishedPlans: boolean;
}

export const DEFAULT_CUSTOMER_LIST_FILTERS: CustomerListFilters = {
  assignment: null,
  hideFinishedPlans: false,
};

function getPersonFilterPreferenceKey(orgId: string): string {
  return `${PERSON_FILTER_PREFERENCE_KEY}_${orgId}`;
}

function parseAssignmentFilter(value: unknown): StoredAssignmentFilter {
  if (value === null) {
    return null;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  if ("kind" in value && value.kind === "unassigned") {
    return { kind: "unassigned" };
  }

  if (
    "kind" in value &&
    value.kind === "practitioner" &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string"
  ) {
    return {
      kind: "practitioner",
      id: value.id,
      name: value.name,
    };
  }

  return null;
}

export function getStoredCustomerListFilters(orgId: string): CustomerListFilters {
  try {
    const key = getPersonFilterPreferenceKey(orgId);
    const stored = localStorage.getItem(key);
    if (!stored) {
      return DEFAULT_CUSTOMER_LIST_FILTERS;
    }

    const parsed: unknown = JSON.parse(stored);

    if (parsed === null) {
      return DEFAULT_CUSTOMER_LIST_FILTERS;
    }

    if (typeof parsed === "object" && parsed !== null && "hideFinishedPlans" in parsed) {
      return {
        assignment: parseAssignmentFilter("assignment" in parsed ? parsed.assignment : null),
        hideFinishedPlans: Boolean(parsed.hideFinishedPlans),
      };
    }

    return {
      assignment: parseAssignmentFilter(parsed),
      hideFinishedPlans: false,
    };
  } catch {
    return DEFAULT_CUSTOMER_LIST_FILTERS;
  }
}

export function storeCustomerListFilters(orgId: string, filters: CustomerListFilters): void {
  try {
    const key = getPersonFilterPreferenceKey(orgId);
    if (!filters.assignment && !filters.hideFinishedPlans) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, JSON.stringify(filters));
  } catch {
    // localStorage not available.
  }
}
