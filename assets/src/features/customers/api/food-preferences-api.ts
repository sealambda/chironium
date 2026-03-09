import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Queries ─────────────────────────────────────────────────────────

const ListFoodPreferenceObservationsQuery = graphql(`
  query ListFoodPreferenceObservations(
    $filter: ObservationFilterInput
    $sort: [ObservationSortInput]
    $first: Int
  ) {
    listFoodPreferenceObservations(
      filter: $filter
      sort: $sort
      first: $first
    ) {
      results {
        id
        effectiveDateTime
        valueString
        valueCodeableConcept {
          coding {
            display
          }
        }
        note {
          text
          time
          authorString
        }
      }
    }
  }
`);

const ListFoodAversionObservationsQuery = graphql(`
  query ListFoodAversionObservations(
    $filter: ObservationFilterInput
    $sort: [ObservationSortInput]
    $first: Int
  ) {
    listFoodAversionObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueString
        valueCodeableConcept {
          coding {
            display
          }
        }
        note {
          text
          time
          authorString
        }
      }
    }
  }
`);

// ─── Mutations ───────────────────────────────────────────────────────

const LogFoodPreferenceMutation = graphql(`
  mutation LogFoodPreference($input: LogFoodPreferenceInput!) {
    logFoodPreference(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const LogFoodAversionMutation = graphql(`
  mutation LogFoodAversion($input: LogFoodAversionInput!) {
    logFoodAversion(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

// ─── Types ───────────────────────────────────────────────────────────

/** Form data for included and excluded foods in the diet step. */
export interface FoodFormData {
  included: string[];
  excluded: string[];
}

/** Aggregated food preference labels fetched from coded observations. */
export interface FoodPreferencesData {
  included: string[];
  excluded: string[];
}

/** A single row for the food preferences history table. */
export interface FoodPreferenceHistoryItem {
  id: string;
  date: string | null;
  type: "inclusion" | "exclusion";
  items: string;
  notes: {
    text?: string | null;
    authorString?: string | null;
    time?: string | null;
  }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

const SORT_NEWEST_FIRST = [{ field: "EFFECTIVE_DATE_TIME" as const, order: "DESC" as const }];

function buildSubjectFilter(personId: string) {
  return {
    subject: { personId: { eq: personId } },
  };
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Fetch food preference and aversion observations for the history table.
 * Returns one row per observation, sorted newest first.
 */
export async function fetchFoodPreferencesHistory(
  personId: string,
  organizationId: string,
): Promise<FoodPreferenceHistoryItem[]> {
  if (!personId || !organizationId) {
    return [];
  }

  const variables = {
    filter: buildSubjectFilter(personId),
    sort: SORT_NEWEST_FIRST,
    first: 250,
  };

  const [preferenceResult, aversionResult] = await Promise.all([
    requestGraphql({
      document: ListFoodPreferenceObservationsQuery,
      variables,
      organizationId,
    }),
    requestGraphql({
      document: ListFoodAversionObservationsQuery,
      variables,
      organizationId,
    }),
  ]);

  const toItems = (obs: {
    id: string;
    effectiveDateTime?: string | null;
    valueString?: string | null;
    valueCodeableConcept?: {
      coding?: { display?: string | null }[] | null;
    } | null;
    note?:
      | {
          text?: string | null;
          authorString?: string | null;
          time?: string | null;
        }[]
      | null;
  }): string => {
    if (obs.valueString !== null && obs.valueString !== undefined) {
      return obs.valueString;
    }
    return (
      obs.valueCodeableConcept?.coding?.flatMap((c) => (c.display ? [c.display] : [])).join(", ") ??
      ""
    );
  };

  const preferences: FoodPreferenceHistoryItem[] = (
    preferenceResult.listFoodPreferenceObservations?.results ?? []
  ).map((obs) => ({
    id: obs.id,
    date: obs.effectiveDateTime ?? null,
    type: "inclusion" as const,
    items: toItems(obs),
    notes: obs.note ?? [],
  }));

  const aversions: FoodPreferenceHistoryItem[] = (
    aversionResult.listFoodAversionObservations?.results ?? []
  ).map((obs) => ({
    id: obs.id,
    date: obs.effectiveDateTime ?? null,
    type: "exclusion" as const,
    items: toItems(obs),
    notes: obs.note ?? [],
  }));

  return [...preferences, ...aversions].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

/**
 * Fetch food preference and aversion observations for a person and return
 * aggregated tag labels from each observation's valueCodeableConcept coding.
 */
export async function fetchFoodPreferences(
  personId: string,
  organizationId: string,
): Promise<FoodPreferencesData> {
  if (!personId || !organizationId) {
    return { included: [], excluded: [] };
  }

  const variables = {
    filter: buildSubjectFilter(personId),
    sort: SORT_NEWEST_FIRST,
    first: 250,
  };

  const [preferenceResult, aversionResult] = await Promise.all([
    requestGraphql({
      document: ListFoodPreferenceObservationsQuery,
      variables,
      organizationId,
    }),
    requestGraphql({
      document: ListFoodAversionObservationsQuery,
      variables,
      organizationId,
    }),
  ]);

  const extractItems = (
    results: {
      valueCodeableConcept?: {
        coding?: { display?: string | null }[] | null;
      } | null;
      valueString?: string | null;
    }[],
  ): string[] =>
    results.flatMap((obs) => {
      const fromCoding =
        obs.valueCodeableConcept?.coding?.flatMap((c) => (c.display ? [c.display.trim()] : [])) ??
        [];

      if (fromCoding.length > 0) {
        return fromCoding;
      }

      return (obs.valueString ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    });

  return {
    included: extractItems(preferenceResult.listFoodPreferenceObservations?.results ?? []),
    excluded: extractItems(aversionResult.listFoodAversionObservations?.results ?? []),
  };
}

/**
 * Log food preference and/or aversion observations. Skips empty lists.
 */
export async function createFoodObservations(
  data: FoodFormData,
  subjectId: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  const promises: Promise<void>[] = [];
  const includedCsv = data.included.filter((s) => s.trim()).join(",");
  const excludedCsv = data.excluded.filter((s) => s.trim()).join(",");

  if (includedCsv) {
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: LogFoodPreferenceMutation,
          variables: {
            input: {
              valueString: includedCsv,
              note: [
                {
                  text: includedCsv,
                  authorReference: userId,
                  time: new Date().toISOString(),
                },
              ],
              subjectId,
            },
          },
          organizationId,
        });
        unwrapMutationResult(result.logFoodPreference, "Failed to log food preference.");
      })(),
    );
  }

  if (excludedCsv) {
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: LogFoodAversionMutation,
          variables: {
            input: {
              valueString: excludedCsv,
              note: [
                {
                  text: excludedCsv,
                  authorReference: userId,
                  time: new Date().toISOString(),
                },
              ],
              subjectId,
            },
          },
          organizationId,
        });
        unwrapMutationResult(result.logFoodAversion, "Failed to log food aversion.");
      })(),
    );
  }

  await Promise.all(promises);
}
