import type { VersionActorSource } from "@/features/customers/types/activity-feed";
import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import { toDateTimeInput } from "@/shared/utils/date-time-input";

// ─── Queries ─────────────────────────────────────────────────────────

const ListAnthropometryObservationsQuery = graphql(`
  query ListAnthropometryObservations(
    $filter: ObservationFilterInput!
    $sort: [ObservationSortInput]
    $first: Int
  ) {
    weight: listBodyWeightObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
        }
        note {
          text
          time
          authorReference
          authorString
        }
        paperTrailVersions(limit: 1) {
          versionActionName
          versionInsertedAt
          changedBy {
            id
            name
          }
          changedByPractitioner {
            id
            name {
              text
              given
              family
            }
          }
        }
      }
    }
    height: listBodyHeightObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
        }
        note {
          text
          time
          authorReference
          authorString
        }
        paperTrailVersions(limit: 1) {
          versionActionName
          versionInsertedAt
          changedBy {
            id
            name
          }
          changedByPractitioner {
            id
            name {
              text
              given
              family
            }
          }
        }
      }
    }
    bmi: listBmiObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
        }
        note {
          text
          time
          authorReference
          authorString
        }
        paperTrailVersions(limit: 1) {
          versionActionName
          versionInsertedAt
          changedBy {
            id
            name
          }
          changedByPractitioner {
            id
            name {
              text
              given
              family
            }
          }
        }
      }
    }
    chest: listChestCircumferenceObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
        }
        note {
          text
          time
          authorReference
          authorString
        }
        paperTrailVersions(limit: 1) {
          versionActionName
          versionInsertedAt
          changedBy {
            id
            name
          }
          changedByPractitioner {
            id
            name {
              text
              given
              family
            }
          }
        }
      }
    }
    waist: listWaistCircumferenceObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
        }
        note {
          text
          time
          authorReference
          authorString
        }
        paperTrailVersions(limit: 1) {
          versionActionName
          versionInsertedAt
          changedBy {
            id
            name
          }
          changedByPractitioner {
            id
            name {
              text
              given
              family
            }
          }
        }
      }
    }
    hip: listHipCircumferenceObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
        }
        note {
          text
          time
          authorReference
          authorString
        }
        paperTrailVersions(limit: 1) {
          versionActionName
          versionInsertedAt
          changedBy {
            id
            name
          }
          changedByPractitioner {
            id
            name {
              text
              given
              family
            }
          }
        }
      }
    }
    arm: listArmCircumferenceObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
        }
        note {
          text
          time
          authorReference
          authorString
        }
        paperTrailVersions(limit: 1) {
          versionActionName
          versionInsertedAt
          changedBy {
            id
            name
          }
          changedByPractitioner {
            id
            name {
              text
              given
              family
            }
          }
        }
      }
    }
    thigh: listThighCircumferenceObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
        }
        note {
          text
          time
          authorReference
          authorString
        }
        paperTrailVersions(limit: 1) {
          versionActionName
          versionInsertedAt
          changedBy {
            id
            name
          }
          changedByPractitioner {
            id
            name {
              text
              given
              family
            }
          }
        }
      }
    }
    whr: listWaistHipRatioObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
        }
        note {
          text
          time
          authorReference
          authorString
        }
        paperTrailVersions(limit: 1) {
          versionActionName
          versionInsertedAt
          changedBy {
            id
            name
          }
          changedByPractitioner {
            id
            name {
              text
              given
              family
            }
          }
        }
      }
    }
  }
`);

// ─── Mutations ───────────────────────────────────────────────────────

const LogBodyHeightMutation = graphql(`
  mutation LogBodyHeight($input: LogBodyHeightInput!) {
    logBodyHeight(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

const LogBodyWeightMutation = graphql(`
  mutation LogBodyWeight($input: LogBodyWeightInput!) {
    logBodyWeight(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

const LogChestCircumferenceMutation = graphql(`
  mutation LogChestCircumference($input: LogChestCircumferenceInput!) {
    logChestCircumference(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

const LogWaistCircumferenceMutation = graphql(`
  mutation LogWaistCircumference($input: LogWaistCircumferenceInput!) {
    logWaistCircumference(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

const LogHipCircumferenceMutation = graphql(`
  mutation LogHipCircumference($input: LogHipCircumferenceInput!) {
    logHipCircumference(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

const LogArmCircumferenceMutation = graphql(`
  mutation LogArmCircumference($input: LogArmCircumferenceInput!) {
    logArmCircumference(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

const LogThighCircumferenceMutation = graphql(`
  mutation LogThighCircumference($input: LogThighCircumferenceInput!) {
    logThighCircumference(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

const UpdateAnthropometryObservationMutation = graphql(`
  mutation UpdateAnthropometryObservation($id: ID!, $input: UpdateObservationInput) {
    updateObservation(id: $id, input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const DeleteAnthropometryObservationMutation = graphql(`
  mutation DeleteAnthropometryObservation($id: ID!) {
    deleteObservation(id: $id) {
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

/** A point-in-time snapshot of all anthropometric measurements for a person. */
export interface AnthropometryAnnotation {
  text?: string | null;
  authorReference?: string | null;
  authorString?: string | null;
  time?: string | null;
}

export type AnthropometryObservationKey =
  | "weight"
  | "height"
  | "bmi"
  | "whr"
  | "chest"
  | "waist"
  | "hip"
  | "arm"
  | "thigh";

export interface AnthropometryObservationRef {
  id: string;
  note: AnthropometryAnnotation[];
}

export interface AnthropometricSnapshot {
  date: string;
  weight?: number;
  height?: number;
  bmi?: number;
  whr?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  arm?: number;
  thigh?: number;
  observations?: Partial<Record<AnthropometryObservationKey, AnthropometryObservationRef>>;
  primaryObservationId?: string;
  notes?: AnthropometryAnnotation[];
  paperTrailVersions?: VersionActorSource[];
}

/** Keys for circumference measurement fields on an anthropometric snapshot. */
export type CircumferenceKey = "chest" | "waist" | "hip" | "arm" | "thigh";

/** Form data for logging body measurements during onboarding. */
export interface AnthropometryFormData {
  effectiveDate?: string | null;
  effectiveTime?: string | null;
  heightCm: number | null;
  weightKg: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
}

export interface AnthropometryUpdateInput {
  effectiveDate?: string | null;
  effectiveTime?: string | null;
  weightKg: number | null;
  heightCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
}

export interface AnthropometryAnnotationInput {
  text: string;
  authorReference?: string | null;
  authorString?: string | null;
  time?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

type AnthropometryResult = ResultOf<typeof ListAnthropometryObservationsQuery>;
type ObservationPage = AnthropometryResult["weight"];
type ObservationRecord = NonNullable<NonNullable<ObservationPage>["results"]>[number];

/** Parse the numeric value from a FHIR valueQuantity string, returning undefined on NaN or missing data. */
export function extractValue(obs: ObservationRecord | undefined): number | undefined {
  if (!obs?.valueQuantity?.value) {
    return undefined;
  }
  const n = Number.parseFloat(obs.valueQuantity.value);
  return Number.isNaN(n) ? undefined : n;
}

function extractNote(obs: ObservationRecord | undefined): AnthropometryAnnotation[] {
  return obs?.note ?? [];
}

function getObservationRef(
  obs: ObservationRecord | undefined,
): AnthropometryObservationRef | undefined {
  if (!obs?.id) {
    return undefined;
  }
  return {
    id: obs.id,
    note: extractNote(obs),
  };
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Fetch the full anthropometric history for a person (up to 250 records per measurement type).
 *
 * Observations are grouped by calendar date so measurements recorded on different days are
 * never merged into the same snapshot. Returns snapshots sorted DESC by date — consumers that
 * only need the latest entries can read `result[0]` (most recent) and `result[1]` (previous).
 */
export async function fetchAnthropometryHistory(
  personId: string,
  organizationId: string,
): Promise<AnthropometricSnapshot[]> {
  if (!personId || !organizationId) {
    return [];
  }

  const data = await requestGraphql({
    document: ListAnthropometryObservationsQuery,
    variables: {
      filter: { subject: { personId: { eq: personId } } },
      sort: [{ field: "EFFECTIVE_DATE_TIME", order: "DESC" }],
      first: 250,
    },
    organizationId,
  });

  // Truncate an ISO datetime to a YYYY-MM-DD date key for grouping.
  const toDateKey = (dt: string): string => dt.slice(0, 10);

  // Accumulate one snapshot per calendar date.
  const byDate = new Map<string, AnthropometricSnapshot>();

  const mergeObservation = (
    snapshot: AnthropometricSnapshot,
    field: AnthropometryObservationKey,
    obs: ObservationRecord,
    dateTime: string,
  ) => {
    if (dateTime > snapshot.date) {
      snapshot.date = dateTime;
    }
    snapshot.observations ??= {};
    const observationRef = getObservationRef(obs);
    if (observationRef) {
      snapshot.observations[field] = observationRef;
      if (!snapshot.primaryObservationId) {
        snapshot.primaryObservationId = observationRef.id;
        snapshot.notes = observationRef.note;
      }
    }
    const value = extractValue(obs);
    if (value !== undefined) {
      snapshot[field] = value;
    }
  };

  const merge = (page: ObservationPage, field: AnthropometryObservationKey) => {
    for (const obs of page?.results ?? []) {
      const dt = obs?.effectiveDateTime;
      if (!dt) {
        continue;
      }
      const key = toDateKey(dt);
      let snapshot = byDate.get(key);
      if (!snapshot) {
        snapshot = { date: dt };
        byDate.set(key, snapshot);
      }
      mergeObservation(snapshot, field, obs, dt);
    }
  };

  merge(data.weight, "weight");
  merge(data.height, "height");
  merge(data.bmi, "bmi");
  merge(data.chest, "chest");
  merge(data.waist, "waist");
  merge(data.hip, "hip");
  merge(data.arm, "arm");
  merge(data.thigh, "thigh");
  merge(data.whr, "whr");

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Log all provided anthropometric measurements. Skips absent values.
 */
export async function logAnthropometry(
  data: AnthropometryFormData,
  subjectId: string,
  organizationId: string,
): Promise<void> {
  const effectiveDateTime = toDateTimeInput(data.effectiveDate, data.effectiveTime);
  const promises: Promise<void>[] = [];

  if (data.heightCm && data.heightCm > 0) {
    const heightCm = data.heightCm;
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: LogBodyHeightMutation,
          variables: { input: { subjectId, heightCm, effectiveDateTime } },
          organizationId,
        });
        unwrapMutationResult(result.logBodyHeight, "Failed to log body height.");
      })(),
    );
  }

  if (data.weightKg && data.weightKg > 0) {
    const weightKg = data.weightKg;
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: LogBodyWeightMutation,
          variables: { input: { subjectId, weightKg, effectiveDateTime } },
          organizationId,
        });
        unwrapMutationResult(result.logBodyWeight, "Failed to log body weight.");
      })(),
    );
  }

  if (data.chestCm && data.chestCm > 0) {
    const chestCircumferenceCm = data.chestCm;
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: LogChestCircumferenceMutation,
          variables: { input: { subjectId, chestCircumferenceCm, effectiveDateTime } },
          organizationId,
        });
        unwrapMutationResult(result.logChestCircumference, "Failed to log chest circumference.");
      })(),
    );
  }

  if (data.waistCm && data.waistCm > 0) {
    const waistCircumferenceCm = data.waistCm;
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: LogWaistCircumferenceMutation,
          variables: { input: { subjectId, waistCircumferenceCm, effectiveDateTime } },
          organizationId,
        });
        unwrapMutationResult(result.logWaistCircumference, "Failed to log waist circumference.");
      })(),
    );
  }

  if (data.hipCm && data.hipCm > 0) {
    const hipCircumferenceCm = data.hipCm;
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: LogHipCircumferenceMutation,
          variables: { input: { subjectId, hipCircumferenceCm, effectiveDateTime } },
          organizationId,
        });
        unwrapMutationResult(result.logHipCircumference, "Failed to log hip circumference.");
      })(),
    );
  }

  if (data.armCm && data.armCm > 0) {
    const armCircumferenceCm = data.armCm;
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: LogArmCircumferenceMutation,
          variables: { input: { subjectId, armCircumferenceCm, effectiveDateTime } },
          organizationId,
        });
        unwrapMutationResult(result.logArmCircumference, "Failed to log arm circumference.");
      })(),
    );
  }

  if (data.thighCm && data.thighCm > 0) {
    const thighCircumferenceCm = data.thighCm;
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: LogThighCircumferenceMutation,
          variables: { input: { subjectId, thighCircumferenceCm, effectiveDateTime } },
          organizationId,
        });
        unwrapMutationResult(result.logThighCircumference, "Failed to log thigh circumference.");
      })(),
    );
  }

  await Promise.all(promises);
}

function normalizeQuantity(value: number) {
  return Number.isInteger(value) ? value : Number(value.toFixed(2));
}

async function updateQuantityObservation(
  id: string,
  value: number,
  effectiveDateTime: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateAnthropometryObservationMutation,
    variables: {
      id,
      input: {
        effectiveDateTime,
        valueQuantity: { value: normalizeQuantity(value) },
      },
    },
    organizationId,
  });
  unwrapMutationResult(result.updateObservation, "Failed to update anthropometry value.");
}

/**
 * Update editable anthropometry observations linked to the history snapshot.
 * Only existing observations are updated; missing observations are ignored.
 */
export async function updateAnthropometryEntry(
  snapshot: AnthropometricSnapshot,
  data: AnthropometryUpdateInput,
  organizationId: string,
): Promise<void> {
  const effectiveDateTime =
    toDateTimeInput(data.effectiveDate, data.effectiveTime) ||
    snapshot.date ||
    new Date().toISOString();
  const updates: Promise<void>[] = [];
  const observations = snapshot.observations ?? {};

  const editableFields = [
    { observationKey: "weight", inputKey: "weightKg" },
    { observationKey: "height", inputKey: "heightCm" },
    { observationKey: "chest", inputKey: "chestCm" },
    { observationKey: "waist", inputKey: "waistCm" },
    { observationKey: "hip", inputKey: "hipCm" },
    { observationKey: "arm", inputKey: "armCm" },
    { observationKey: "thigh", inputKey: "thighCm" },
  ] as const;

  for (const field of editableFields) {
    const id = observations[field.observationKey]?.id;
    const value = data[field.inputKey];
    if (!id || value === null || value <= 0) {
      continue;
    }
    updates.push(updateQuantityObservation(id, value, effectiveDateTime, organizationId));
  }

  await Promise.all(updates);
}

/**
 * Replace annotation notes for the snapshot primary observation.
 */
export async function updateAnthropometryNotes(
  snapshot: AnthropometricSnapshot,
  notes: AnthropometryAnnotationInput[],
  organizationId: string,
): Promise<void> {
  const observationId = snapshot.primaryObservationId;
  if (!observationId) {
    throw new Error("Anthropometry note update failed: missing observation id.");
  }

  const result = await requestGraphql({
    document: UpdateAnthropometryObservationMutation,
    variables: {
      id: observationId,
      input: {
        note: notes.map((note) => ({
          text: note.text,
          ...toAuthorInput(note),
          time: note.time ?? undefined,
        })),
      },
    },
    organizationId,
  });
  unwrapMutationResult(result.updateObservation, "Failed to update anthropometry notes.");
}

/**
 * Delete all observations associated with a history snapshot row.
 */
export async function deleteAnthropometryEntry(
  snapshot: AnthropometricSnapshot,
  organizationId: string,
): Promise<void> {
  const ids = Array.from(
    new Set(
      Object.values(snapshot.observations ?? {})
        .map((observation) => observation?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  await Promise.all(
    ids.map(async (id) => {
      const result = await requestGraphql({
        document: DeleteAnthropometryObservationMutation,
        variables: { id },
        organizationId,
      });
      unwrapMutationResult(result.deleteObservation, "Failed to delete anthropometry observation.");
    }),
  );
}
