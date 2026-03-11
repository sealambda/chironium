import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import { toAuthorInput } from "@/features/customers/utils/annotation-author";

import type { AnnotationInput } from "./observations-api";

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
            system
            code
            version
            display
          }
        }
        note {
          text
          time
          authorReference
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
            system
            code
            version
            display
          }
        }
        note {
          text
          time
          authorReference
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

const UpdateFoodObservationMutation = graphql(`
  mutation UpdateFoodObservation($id: ID!, $input: UpdateObservationInput) {
    updateObservation(id: $id, input: $input) {
      result {
        id
        valueString
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

/** Aggregated food preference labels for the summary card. */
export interface FoodPreferencesData {
  included: string[];
  excluded: string[];
}

/** A single coding entry for coded values. */
export interface ObservationCoding {
  system: string;
  code: string;
  display?: string | null;
  version?: string | null;
}

/** A single row for the food preferences history table. */
export interface FoodPreferenceHistoryItem {
  id: string;
  date: string | null;
  type: "inclusion" | "exclusion";
  items: string;
  /** True when the value comes from a coded concept — these rows are not editable. */
  isCoded: boolean;
  /** Populated for coded rows; empty for free-text rows. */
  codings: ObservationCoding[];
  notes: {
    text?: string | null;
    authorReference?: string | null;
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

  type ObsNode = {
    id: string;
    effectiveDateTime?: string | null;
    valueString?: string | null;
    valueCodeableConcept?: {
      coding?:
        | { system: string; code: string; version?: string | null; display?: string | null }[]
        | null;
    } | null;
    note?:
      | {
          text?: string | null;
          authorReference?: string | null;
          authorString?: string | null;
          time?: string | null;
        }[]
      | null;
  };

  const toHistoryItem = (
    obs: ObsNode,
    type: FoodPreferenceHistoryItem["type"],
  ): FoodPreferenceHistoryItem => {
    const rawCodings = obs.valueCodeableConcept?.coding ?? [];
    const isCoded = rawCodings.length > 0;
    const items = isCoded
      ? rawCodings.flatMap((c) => (c.display ? [c.display] : [])).join(", ")
      : (obs.valueString ?? "");
    const codings: ObservationCoding[] = rawCodings.map((c) => ({
      system: c.system,
      code: c.code,
      display: c.display,
      version: c.version,
    }));
    return {
      id: obs.id,
      date: obs.effectiveDateTime ?? null,
      type,
      isCoded,
      codings,
      items,
      notes: obs.note ?? [],
    };
  };

  const preferences: FoodPreferenceHistoryItem[] = (
    preferenceResult.listFoodPreferenceObservations?.results ?? []
  ).map((obs) => toHistoryItem(obs, "inclusion"));

  const aversions: FoodPreferenceHistoryItem[] = (
    aversionResult.listFoodAversionObservations?.results ?? []
  ).map((obs) => toHistoryItem(obs, "exclusion"));

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

  const extractLabels = (
    results: {
      valueCodeableConcept?: { coding?: { display?: string | null }[] | null } | null;
      valueString?: string | null;
    }[],
  ): string[] =>
    results.flatMap((obs) => {
      if ((obs.valueCodeableConcept?.coding?.length ?? 0) > 0) {
        return obs.valueCodeableConcept!.coding!.flatMap((c) =>
          c.display ? [c.display.trim()] : [],
        );
      }
      return (obs.valueString ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    });

  return {
    included: extractLabels(preferenceResult.listFoodPreferenceObservations?.results ?? []),
    excluded: extractLabels(aversionResult.listFoodAversionObservations?.results ?? []),
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
  userName: string,
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
                  ...(userId ? { authorReference: userId } : { authorString: userName }),
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
                  ...(userId ? { authorReference: userId } : { authorString: userName }),
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

/**
 * Replace the annotation notes array on a food preference or aversion observation.
 * Sends the full notes array — partial updates are not supported by the API.
 */
export async function updateFoodObservationNotes(
  id: string,
  notes: AnnotationInput[],
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateFoodObservationMutation,
    variables: {
      id,
      input: {
        note: notes.map((n) => ({
          text: n.text,
          ...toAuthorInput(n),
          time: n.time ?? undefined,
        })),
      },
    },
    organizationId,
  });
  unwrapMutationResult(result.updateObservation, "Failed to update food observation notes.");
}

/**
 * Update the valueString of an uncoded food preference or aversion observation.
 * For multi-item observations (CSV), pass the full updated CSV as `newValueString`.
 */
export async function updateFoodObservationText(
  id: string,
  newValueString: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateFoodObservationMutation,
    // Explicitly clear valueCodeableConcept so the backend's exactly-one-value
    // constraint is satisfied when overwriting a previously coded observation.
    variables: { id, input: { valueString: newValueString, valueCodeableConcept: null } },
    organizationId,
  });
  unwrapMutationResult(result.updateObservation, "Failed to update food preference.");
}
