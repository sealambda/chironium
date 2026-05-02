import type {
  PersonAssignmentFilter,
  PersonListSortOption,
} from "@/features/customers/api/persons-api";

/** Accessible organizations list (org picker / store). */
export const ORG_QUERY_KEY = ["orgs", "accessible"] as const;

/** Current user profile. */
export const USER_QUERY_KEY = ["user", "current"] as const;

/** Prefix for `fetchOrganizationSettings`; append `organizationId`. */
export const ORG_SETTINGS_QUERY_KEY = ["org", "settings"] as const;

export function orgSettingsQueryKey(organizationId: string) {
  return [...ORG_SETTINGS_QUERY_KEY, organizationId] as const;
}

/** Subscription plans for an organization (org billing + onboarding plan pickers). */
export function subscriptionPlansQueryKey(organizationId: string) {
  return ["subscription-plans", organizationId] as const;
}

/** Practitioners list for bulk customer reassignment. */
export function practitionersBulkReassignQueryKey(organizationId: string) {
  return ["practitioners", organizationId, "bulk-reassign"] as const;
}

export function tasksListQueryKey(organizationId: string) {
  return ["tasks", "list", organizationId] as const;
}

/** Customers list and related org-scoped customer caches. */
export const customersQueryKeys = {
  persons(
    organizationId: string,
    sortOption: PersonListSortOption,
    assignmentFilter: PersonAssignmentFilter,
  ) {
    return ["customers", "persons", organizationId, sortOption, assignmentFilter] as const;
  },
  /** Any persons list query for the org (all sort variants). */
  personsPrefix(organizationId: string) {
    return ["customers", "persons", organizationId] as const;
  },
  subscriptions(organizationId: string) {
    return ["customers", "subscriptions", organizationId] as const;
  },
  practitionerPersonIds(organizationId: string, practitionerId: string) {
    return ["customers", "practitioner-persons", organizationId, practitionerId] as const;
  },
  /** Any practitioner-persons query for the org (all practitioner variants). */
  practitionerPersonIdsPrefix(organizationId: string) {
    return ["customers", "practitioner-persons", organizationId] as const;
  },
};

/**
 * Person-scoped TanStack Query keys. Use `*Scope` helpers for invalidation when
 * the active query may include `organizationId` (prefix match).
 */
export const personQueryKeys = {
  root(personId: string) {
    return ["person", personId] as const;
  },
  patientDetail(personId: string, organizationId: string) {
    return ["person", personId, "patient-detail", organizationId] as const;
  },
  patientDetailScope(personId: string) {
    return ["person", personId, "patient-detail"] as const;
  },
  subscriptions(personId: string, organizationId: string) {
    return ["person", personId, "subscriptions", organizationId] as const;
  },
  reviewTasks(personId: string, organizationId: string, patientId: string) {
    return ["person", personId, "review-tasks", organizationId, patientId] as const;
  },
  reviewTasksScope(personId: string) {
    return ["person", personId, "review-tasks"] as const;
  },
  patientTasks(personId: string, organizationId: string, patientId: string) {
    return ["person", personId, "patient-tasks", organizationId, patientId] as const;
  },
  patientTasksScope(personId: string) {
    return ["person", personId, "patient-tasks"] as const;
  },
};
