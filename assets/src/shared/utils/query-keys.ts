import type { PersonListSortOption } from "@/features/customers/api/persons-api";

/** Accessible organizations list (org picker / store). */
export const ORG_QUERY_KEY = ["orgs", "accessible"] as const;

/** Current user profile. */
export const USER_QUERY_KEY = ["user", "current"] as const;

/** Prefix for `fetchOrganizationSettings`; append `organizationId`. */
export const ORG_SETTINGS_QUERY_KEY = ["org", "settings"] as const;

export function orgSettingsQueryKey(organizationId: string) {
  return [...ORG_SETTINGS_QUERY_KEY, organizationId] as const;
}

/** Pending org invitations (header / dialog). */
export const INVITATIONS_QUERY_KEY = ["org", "pending-invitations"] as const;

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
  persons(organizationId: string, sortOption: PersonListSortOption) {
    return ["customers", "persons", organizationId, sortOption] as const;
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
  anthropometry(personId: string, organizationId: string) {
    return ["person", personId, "anthropometry", organizationId] as const;
  },
  observations(personId: string, organizationId: string) {
    return ["person", personId, "observations", organizationId] as const;
  },
  menstrualCycle(personId: string, organizationId: string) {
    return ["person", personId, "menstrualCycle", organizationId] as const;
  },
  foodPreferences(personId: string, organizationId: string) {
    return ["person", personId, "foodPreferences", organizationId] as const;
  },
  foodPreferencesScope(personId: string) {
    return ["person", personId, "foodPreferences"] as const;
  },
  goals(personId: string, organizationId: string) {
    return ["person", personId, "goals", organizationId] as const;
  },
  goalsScope(personId: string) {
    return ["person", personId, "goals"] as const;
  },
  nutritionPlans(personId: string, organizationId: string) {
    return ["person", personId, "nutritionPlans", organizationId] as const;
  },
  foodPreferencesHistory(personId: string, organizationId: string) {
    return ["person", personId, "foodPreferencesHistory", organizationId] as const;
  },
  foodPreferencesHistoryScope(personId: string) {
    return ["person", personId, "foodPreferencesHistory"] as const;
  },
  conditions(personId: string, organizationId: string) {
    return ["person", personId, "conditions", organizationId] as const;
  },
  conditionsScope(personId: string) {
    return ["person", personId, "conditions"] as const;
  },
  allergyIntolerances(personId: string, organizationId: string) {
    return ["person", personId, "allergyIntolerances", organizationId] as const;
  },
  allergyIntolerancesScope(personId: string) {
    return ["person", personId, "allergyIntolerances"] as const;
  },
  medications(personId: string, organizationId: string) {
    return ["person", personId, "medications", organizationId] as const;
  },
  medicationsScope(personId: string) {
    return ["person", personId, "medications"] as const;
  },
  observationsList(personId: string, organizationId: string) {
    return ["person", personId, "observationsList", organizationId] as const;
  },
  observationsListScope(personId: string) {
    return ["person", personId, "observationsList"] as const;
  },
  observationsScope(personId: string) {
    return ["person", personId, "observations"] as const;
  },
  anthropometryHistory(personId: string, organizationId: string) {
    return ["person", personId, "anthropometryHistory", organizationId] as const;
  },
  anthropometryHistoryScope(personId: string) {
    return ["person", personId, "anthropometryHistory"] as const;
  },
  anthropometryScope(personId: string) {
    return ["person", personId, "anthropometry"] as const;
  },
  reviewTasks(personId: string, organizationId: string, patientId: string) {
    return ["person", personId, "review-tasks", organizationId, patientId] as const;
  },
  reviewTasksScope(personId: string) {
    return ["person", personId, "review-tasks"] as const;
  },
};
