import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import { formatPersonName } from "@/shared/utils/person-utils";

import type { PersonFormData } from "./patients-api";
import type { SubscriptionListItem } from "./subscriptions-api";

// ─── Queries ─────────────────────────────────────────────────────────

const ListPersonsQuery = graphql(`
  query ListPersons($first: Int, $sort: [PersonSortInput]) {
    listPersons(first: $first, sort: $sort) {
      results {
        id
        name {
          given
          family
        }
        telecom {
          system
          value
        }
        birthDate
        gender
      }
    }
  }
`);

export type PersonListSortOption = "moreRecent" | "lessRecent" | "nameAsc" | "nameDesc";

const SORT_MORE_RECENT_FIRST = [{ field: "ID" as const, order: "DESC" as const }];
const SORT_LESS_RECENT_FIRST = [{ field: "ID" as const, order: "ASC" as const }];

function getPersonApiSort(sort: PersonListSortOption) {
  if (sort === "lessRecent") {
    return SORT_LESS_RECENT_FIRST;
  }
  return SORT_MORE_RECENT_FIRST;
}

function sortPersonsByName(persons: Person[], sort: PersonListSortOption): Person[] {
  if (sort === "nameAsc") {
    return [...persons].sort((a, b) =>
      formatPersonName(a.name).toLowerCase().localeCompare(formatPersonName(b.name).toLowerCase()),
    );
  }
  return [...persons].sort((a, b) =>
    formatPersonName(b.name).toLowerCase().localeCompare(formatPersonName(a.name).toLowerCase()),
  );
}

// ─── Mutations ───────────────────────────────────────────────────────

const UpdatePersonMutation = graphql(`
  mutation UpdatePerson($id: ID!, $input: UpdatePersonInput!) {
    updatePerson(id: $id, input: $input) {
      result {
        id
        name {
          given
          family
        }
        telecom {
          system
          value
        }
        gender
        birthDate
      }
      errors {
        message
      }
    }
  }
`);

// ─── Types ───────────────────────────────────────────────────────────

/** A person record from the list query. */
export type Person = NonNullable<
  NonNullable<ResultOf<typeof ListPersonsQuery>["listPersons"]>["results"]
>[number];

/** A person optionally enriched with their most recent subscription. */
export interface CustomerListItem {
  person: Person;
  subscription?: SubscriptionListItem;
}

// ─── Functions ───────────────────────────────────────────────────────

/** Fetch all persons for the organization. */
export async function fetchPersons(
  organizationId: string,
  sort: PersonListSortOption = "moreRecent",
): Promise<Person[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: ListPersonsQuery,
    variables: {
      first: 250,
      sort: getPersonApiSort(sort),
    },
    organizationId,
  });

  const persons = result.listPersons?.results ?? [];
  if (sort === "nameAsc" || sort === "nameDesc") {
    return sortPersonsByName(persons, sort);
  }
  return persons;
}

/**
 * Merge a flat persons list with a flat subscriptions list while preserving
 * the original persons ordering from the backend. Where a person has multiple
 * subscriptions, the most-recent one (first in list when sorted START_DATE DESC)
 * is kept.
 */
export function mergePersonsWithSubscriptions(
  persons: Person[],
  subscriptions: SubscriptionListItem[],
): CustomerListItem[] {
  // Index subscriptions by subscriberId for O(1) lookup; keep only the most recent.
  const subsByPersonId = new Map<string, SubscriptionListItem>();
  for (const sub of subscriptions) {
    if (sub.subscriberId && !subsByPersonId.has(sub.subscriberId)) {
      subsByPersonId.set(sub.subscriberId, sub);
    }
  }

  return persons.map((person) => ({
    person,
    subscription: subsByPersonId.get(person.id),
  }));
}

/** Update a person's demographics and contact info. */
export async function updatePerson(
  personId: string,
  data: PersonFormData,
  organizationId: string,
): Promise<void> {
  const fullName = `${data.givenName} ${data.familyName}`.trim();
  const telecom: Array<{ system: string; value: string }> = [];
  if (data.phone) {
    telecom.push({ system: "PHONE", value: data.phone });
  }
  if (data.email) {
    telecom.push({ system: "EMAIL", value: data.email });
  }
  if (data.instagram) {
    telecom.push({ system: "URL", value: data.instagram });
  }

  const result = await requestGraphql({
    document: UpdatePersonMutation,
    variables: {
      id: personId,
      input: {
        name: [{ given: [data.givenName], family: data.familyName, text: fullName }],
        birthDate: data.birthDate || undefined,
        gender: data.gender || undefined,
        telecom: telecom.length > 0 ? telecom : undefined,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.updatePerson, "Failed to update person.");
}
