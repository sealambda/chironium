import type { PatientObservation } from "@/features/customers/api/patients-api";
import type { VersionActorSource } from "@/features/customers/types/activity-feed";
import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import { toDateTimeInput } from "@/shared/utils/date-time-input";

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
  paperTrailVersions?: VersionActorSource[];
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

type ObservationRecord = PatientObservation;

/** Parse the numeric value from a FHIR valueQuantity string, returning undefined on NaN or missing data. */
export function extractValue(obs: ObservationRecord | undefined): number | undefined {
  if (!obs?.valueQuantity?.value) {
    return undefined;
  }
  const n = Number.parseFloat(obs.valueQuantity.value);
  return Number.isNaN(n) ? undefined : n;
}

function anthropometryKeyForObservation(
  obs: ObservationRecord,
): AnthropometryObservationKey | null {
  switch (obs.observationType) {
    case "BODY_WEIGHT":
      return "weight";
    case "BODY_HEIGHT":
      return "height";
    case "BMI":
      return "bmi";
    case "WAIST_HIP_RATIO":
      return "whr";
    case "CHEST_CIRCUMFERENCE":
      return "chest";
    case "WAIST_CIRCUMFERENCE":
      return "waist";
    case "HIP_CIRCUMFERENCE":
      return "hip";
    case "ARM_CIRCUMFERENCE":
      return "arm";
    case "THIGH_CIRCUMFERENCE":
      return "thigh";
    default:
      return null;
  }
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
    paperTrailVersions: obs.paperTrailVersions ?? [],
  };
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Select the full anthropometric history from patient observations.
 *
 * Observations are grouped by calendar date so measurements recorded on different days are
 * never merged into the same snapshot. Returns snapshots sorted DESC by date — consumers that
 * only need the latest entries can read `result[0]` (most recent) and `result[1]` (previous).
 */
export function selectAnthropometryHistory(
  observations: readonly ObservationRecord[] | null | undefined,
): AnthropometricSnapshot[] {
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
        snapshot.paperTrailVersions = observationRef.paperTrailVersions;
      }
    }
    const value = extractValue(obs);
    if (value !== undefined) {
      snapshot[field] = value;
    }
  };

  for (const obs of observations ?? []) {
    const field = anthropometryKeyForObservation(obs);
    const dt = obs.effectiveDateTime;
    if (!field || !dt) {
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
  const effectiveDateTime =
    toDateTimeInput(data.effectiveDate, data.effectiveTime) ?? new Date().toISOString();

  const fields: {
    key: "weight" | "height" | "chest" | "waist" | "hip" | "arm" | "thigh";
    value: number | null;
  }[] = [
    { key: "height", value: data.heightCm },
    { key: "weight", value: data.weightKg },
    { key: "chest", value: data.chestCm },
    { key: "waist", value: data.waistCm },
    { key: "hip", value: data.hipCm },
    { key: "arm", value: data.armCm },
    { key: "thigh", value: data.thighCm },
  ];

  await Promise.all(
    fields
      .filter((f): f is typeof f & { value: number } => f.value != null && f.value > 0)
      .map((f) => logNewObservation(f.key, f.value, subjectId, effectiveDateTime, organizationId)),
  );
}

function normalizeQuantity(value: number) {
  return Number.isInteger(value) ? value : Number(value.toFixed(2));
}

const UNIT_OF_MEASURE_SYSTEM = "http://unitsofmeasure.org";

function quantityCodeForObservation(
  observationKey: "weight" | "height" | "chest" | "waist" | "hip" | "arm" | "thigh",
): "kg" | "cm" {
  return observationKey === "weight" ? "kg" : "cm";
}

async function updateQuantityObservation(
  id: string,
  observationKey: "weight" | "height" | "chest" | "waist" | "hip" | "arm" | "thigh",
  value: number,
  effectiveDateTime: string,
  organizationId: string,
): Promise<void> {
  const quantityCode = quantityCodeForObservation(observationKey);

  const result = await requestGraphql({
    document: UpdateAnthropometryObservationMutation,
    variables: {
      id,
      input: {
        effectiveDateTime,
        valueQuantity: {
          system: UNIT_OF_MEASURE_SYSTEM,
          code: quantityCode,
          value: normalizeQuantity(value),
        },
      },
    },
    organizationId,
  });
  unwrapMutationResult(result.updateObservation, "Failed to update anthropometry value.");
}

async function logNewObservation(
  observationKey: "weight" | "height" | "chest" | "waist" | "hip" | "arm" | "thigh",
  value: number,
  subjectId: string,
  effectiveDateTime: string,
  organizationId: string,
): Promise<void> {
  switch (observationKey) {
    case "weight": {
      const result = await requestGraphql({
        document: LogBodyWeightMutation,
        variables: { input: { subjectId, weightKg: value, effectiveDateTime } },
        organizationId,
      });
      unwrapMutationResult(result.logBodyWeight, "Failed to log body weight.");
      break;
    }
    case "height": {
      const result = await requestGraphql({
        document: LogBodyHeightMutation,
        variables: { input: { subjectId, heightCm: value, effectiveDateTime } },
        organizationId,
      });
      unwrapMutationResult(result.logBodyHeight, "Failed to log body height.");
      break;
    }
    case "chest": {
      const result = await requestGraphql({
        document: LogChestCircumferenceMutation,
        variables: { input: { subjectId, chestCircumferenceCm: value, effectiveDateTime } },
        organizationId,
      });
      unwrapMutationResult(result.logChestCircumference, "Failed to log chest circumference.");
      break;
    }
    case "waist": {
      const result = await requestGraphql({
        document: LogWaistCircumferenceMutation,
        variables: { input: { subjectId, waistCircumferenceCm: value, effectiveDateTime } },
        organizationId,
      });
      unwrapMutationResult(result.logWaistCircumference, "Failed to log waist circumference.");
      break;
    }
    case "hip": {
      const result = await requestGraphql({
        document: LogHipCircumferenceMutation,
        variables: { input: { subjectId, hipCircumferenceCm: value, effectiveDateTime } },
        organizationId,
      });
      unwrapMutationResult(result.logHipCircumference, "Failed to log hip circumference.");
      break;
    }
    case "arm": {
      const result = await requestGraphql({
        document: LogArmCircumferenceMutation,
        variables: { input: { subjectId, armCircumferenceCm: value, effectiveDateTime } },
        organizationId,
      });
      unwrapMutationResult(result.logArmCircumference, "Failed to log arm circumference.");
      break;
    }
    case "thigh": {
      const result = await requestGraphql({
        document: LogThighCircumferenceMutation,
        variables: { input: { subjectId, thighCircumferenceCm: value, effectiveDateTime } },
        organizationId,
      });
      unwrapMutationResult(result.logThighCircumference, "Failed to log thigh circumference.");
      break;
    }
  }
}

/**
 * Update editable anthropometry observations linked to the history snapshot. Existing observations
 * are updated in place; fields with a new value but no existing observation are logged as new.
 */
export async function updateAnthropometryEntry(
  snapshot: AnthropometricSnapshot,
  data: AnthropometryUpdateInput,
  subjectId: string,
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
    if (value === null || value <= 0) {
      continue;
    }
    if (id) {
      updates.push(
        updateQuantityObservation(
          id,
          field.observationKey,
          value,
          effectiveDateTime,
          organizationId,
        ),
      );
    } else {
      // No existing observation for this field — log it as a new one.
      updates.push(
        logNewObservation(
          field.observationKey,
          value,
          subjectId,
          effectiveDateTime,
          organizationId,
        ),
      );
    }
  }

  await Promise.all(updates);
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
