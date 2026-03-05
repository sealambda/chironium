import { graphql, type ResultOf } from "@/graphql";
import { requestGraphql } from "@/shared/api/graphql";

import type { SubscriptionListItem } from "./subscriptions-api";

// ─── Queries ─────────────────────────────────────────────────────────

const ListPersonsQuery = graphql(`
  query ListPersons($first: Int) {
    listPersons(first: $first) {
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
export async function fetchPersons(organizationId: string): Promise<Person[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: ListPersonsQuery,
    variables: { first: 250 },
    organizationId,
  });

  return result.listPersons?.results ?? [];
}

/**
 * Merge a flat persons list with a flat subscriptions list.
 * Persons with a subscription appear first, then the rest sorted
 * alphabetically by family name. Where a person has multiple subscriptions,
 * the most-recent one (first in list when sorted START_DATE DESC) is kept.
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

  const items: CustomerListItem[] = persons.map((person) => ({
    person,
    subscription: subsByPersonId.get(person.id),
  }));

  // Sort: subscribed persons first, then by family name ascending.
  return items.sort((a, b) => {
    const aHasSub = Boolean(a.subscription);
    const bHasSub = Boolean(b.subscription);
    if (aHasSub !== bHasSub) {
      return aHasSub ? -1 : 1;
    }
    const aName = a.person.name?.[0]?.family ?? "";
    const bName = b.person.name?.[0]?.family ?? "";
    return aName.localeCompare(bName);
  });
}
