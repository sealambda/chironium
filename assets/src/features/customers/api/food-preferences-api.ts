import type { PatientObservation } from "@/features/customers/api/patients-api";
import type { VersionActorSource } from "@/features/customers/types/activity-feed";
import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import type { TerminologyTag } from "@/shared/types/terminology";

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
  included: TerminologyTag[];
  excluded: TerminologyTag[];
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
  /** Display text: coded rows use coding displays; free-text rows use valueString. */
  items: string;
  /** Codings from valueCodeableConcept when present; empty when the value is free text only. */
  codings: ObservationCoding[];
  notes: {
    text?: string | null;
    authorReference?: string | null;
    authorString?: string | null;
    time?: string | null;
  }[];
  paperTrailVersions?: VersionActorSource[] | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function foodHistoryTypeForObservation(
  obs: PatientObservation,
): FoodPreferenceHistoryItem["type"] | null {
  if (obs.observationType === "FOOD_PREFERENCE") {
    return "inclusion";
  }
  if (obs.observationType === "FOOD_AVERSION") {
    return "exclusion";
  }
  return null;
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Select food preference and aversion observations for the history table.
 * Returns one row per observation, sorted newest first.
 */
export function selectFoodPreferencesHistory(
  observations: readonly PatientObservation[] | null | undefined,
): FoodPreferenceHistoryItem[] {
  const toHistoryItem = (
    obs: PatientObservation,
    type: FoodPreferenceHistoryItem["type"],
  ): FoodPreferenceHistoryItem => {
    const rawCodings = obs.valueCodeableConcept?.coding ?? [];
    const codedLabels =
      rawCodings.length > 0
        ? rawCodings.flatMap((c) => {
            // Fall back to the coding's `code` so chips never render empty when
            // a localized `display` is unavailable for the requested locale.
            const label = c.display?.trim() || c.code?.trim();
            return label ? [label] : [];
          })
        : [];
    const items =
      codedLabels.length > 0
        ? codedLabels.join(", ")
        : (obs.valueCodeableConcept?.text?.trim() ?? obs.valueString ?? "");
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
      codings,
      items,
      notes: obs.note ?? [],
      paperTrailVersions: obs.paperTrailVersions ?? null,
    };
  };

  return (observations ?? [])
    .flatMap((obs) => {
      const type = foodHistoryTypeForObservation(obs);
      return type ? [toHistoryItem(obs, type)] : [];
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

/**
 * Fetch food preference and aversion observations for a person and return
 * aggregated tag labels from each observation's valueCodeableConcept coding.
 */
export function selectFoodPreferenceLabels(
  history: readonly FoodPreferenceHistoryItem[],
): FoodPreferencesData {
  const included: string[] = [];
  const excluded: string[] = [];

  for (const item of history) {
    const labels = labelsForFoodPreferenceItem(item);
    (item.type === "inclusion" ? included : excluded).push(...labels);
  }

  return { included, excluded };
}

function labelsForFoodPreferenceItem(item: FoodPreferenceHistoryItem): string[] {
  if (item.codings.length > 0) {
    // Coded rows: prefer the localized display, fall back to the raw code so chips never render empty.
    return item.codings.flatMap((coding) => {
      const label = coding.display?.trim() || coding.code?.trim();
      return label ? [label] : [];
    });
  }

  // Free-text rows: `items` is a comma-separated list authored by `createFoodObservations`.
  return item.items
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
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
  const includedText = data.included.filter((entry) => !entry.coding).map((entry) => entry.label);
  const excludedText = data.excluded.filter((entry) => !entry.coding).map((entry) => entry.label);
  const includedCoded = data.included.filter((entry) => Boolean(entry.coding));
  const excludedCoded = data.excluded.filter((entry) => Boolean(entry.coding));

  const includedCsv = includedText.filter((s) => s.trim()).join(",");
  const excludedCsv = excludedText.filter((s) => s.trim()).join(",");

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

  const createCodedObservation = (type: "inclusion" | "exclusion", entry: TerminologyTag) =>
    (async () => {
      if (!entry.coding) {
        return;
      }
      const input = {
        valueCodeableConcept: {
          text: entry.label,
          coding: [
            {
              system: entry.coding.system,
              code: entry.coding.code,
              version: entry.coding.version ?? undefined,
            },
          ],
        },
        note: [
          {
            text: entry.label,
            ...(userId ? { authorReference: userId } : { authorString: userName }),
            time: new Date().toISOString(),
          },
        ],
        subjectId,
      };
      if (type === "inclusion") {
        const result = await requestGraphql({
          document: LogFoodPreferenceMutation,
          variables: { input },
          organizationId,
        });
        unwrapMutationResult(result.logFoodPreference, "Failed to log food preference.");
      } else {
        const result = await requestGraphql({
          document: LogFoodAversionMutation,
          variables: { input },
          organizationId,
        });
        unwrapMutationResult(result.logFoodAversion, "Failed to log food aversion.");
      }
    })();

  promises.push(
    ...includedCoded.map((entry) => createCodedObservation("inclusion", entry)),
    ...excludedCoded.map((entry) => createCodedObservation("exclusion", entry)),
  );

  await Promise.all(promises);
}
