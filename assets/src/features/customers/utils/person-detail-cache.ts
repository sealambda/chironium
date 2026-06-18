import type { QueryClient } from "@tanstack/react-query";

import { customersQueryKeys, personQueryKeys, tasksListQueryKey } from "@/shared/utils/query-keys";

export function invalidatePersonDetail(queryClient: QueryClient, personId: string) {
  return queryClient.invalidateQueries({
    queryKey: personQueryKeys.patientDetailScope(personId),
  });
}

/**
 * Invalidate both person-scoped detail and org-level persons list caches.
 * Use after mutations that affect what's displayed on both the person detail
 * page and the customers list (e.g., editing person info or subscription).
 */
export function invalidatePersonAndOrg(
  queryClient: QueryClient,
  personId: string,
  organizationId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: personQueryKeys.patientDetailScope(personId),
    }),
    queryClient.invalidateQueries({
      queryKey: customersQueryKeys.personsPrefix(organizationId),
    }),
  ]);
}

/** Invalidate every cache that lists a patient's tasks, including the activity feed. */
export function invalidatePatientTasks(
  queryClient: QueryClient,
  personId: string,
  organizationId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: personQueryKeys.patientTasksScope(personId) }),
    queryClient.invalidateQueries({ queryKey: personQueryKeys.reviewTasksScope(personId) }),
    queryClient.invalidateQueries({ queryKey: tasksListQueryKey(organizationId) }),
  ]);
}
