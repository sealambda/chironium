import {
  normalizeQuantity,
  quantityCodeForObservation,
  UNIT_OF_MEASURE_SYSTEM,
} from "@/features/customers/api/anthropometry-api.helpers";
import {
  DeleteAnthropometryObservationMutation,
  LogArmCircumferenceMutation,
  LogBodyHeightMutation,
  LogBodyWeightMutation,
  LogChestCircumferenceMutation,
  LogHipCircumferenceMutation,
  LogThighCircumferenceMutation,
  LogWaistCircumferenceMutation,
  UpdateAnthropometryObservationMutation,
} from "@/features/customers/api/anthropometry-api.queries";
import type { VersionActorSource } from "@/features/customers/types/version-actor-source";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import { toDateTimeInput } from "@/shared/utils/date-time-input";

// ─── Types ───────────────────────────────────────────────────────────

/** A point-in-time snapshot of all anthropometric measurements for a person. */
export interface AnthropometryAnnotation {
  text?: string | null;
  authorReference?: string | null;
  authorString?: string | null;
  time?: string | null;
}

export const CIRCUMFERENCE_KEYS = ["chest", "waist", "hip", "arm", "thigh"] as const;
export type CircumferenceKey = (typeof CIRCUMFERENCE_KEYS)[number];

type WeightKey = "weight";
type HeightKey = "height";
type AnthropometryMeasureKey = WeightKey | HeightKey | CircumferenceKey;
export type AnthropometryObservationKey = AnthropometryMeasureKey | "bmi" | "whr";

export interface AnthropometryObservationRef {
  id: string;
  note: AnthropometryAnnotation[];
  paperTrailVersions?: VersionActorSource[];
  /** The patient reported this value themselves, through a questionnaire. */
  selfReported?: boolean;
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
    key: AnthropometryMeasureKey;
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

async function updateQuantityObservation(
  id: string,
  observationKey: AnthropometryMeasureKey,
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
  observationKey: AnthropometryMeasureKey,
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
        variables: {
          input: { subjectId, chestCircumferenceCm: value, effectiveDateTime },
        },
        organizationId,
      });
      unwrapMutationResult(result.logChestCircumference, "Failed to log chest circumference.");
      break;
    }
    case "waist": {
      const result = await requestGraphql({
        document: LogWaistCircumferenceMutation,
        variables: {
          input: { subjectId, waistCircumferenceCm: value, effectiveDateTime },
        },
        organizationId,
      });
      unwrapMutationResult(result.logWaistCircumference, "Failed to log waist circumference.");
      break;
    }
    case "hip": {
      const result = await requestGraphql({
        document: LogHipCircumferenceMutation,
        variables: {
          input: { subjectId, hipCircumferenceCm: value, effectiveDateTime },
        },
        organizationId,
      });
      unwrapMutationResult(result.logHipCircumference, "Failed to log hip circumference.");
      break;
    }
    case "arm": {
      const result = await requestGraphql({
        document: LogArmCircumferenceMutation,
        variables: {
          input: { subjectId, armCircumferenceCm: value, effectiveDateTime },
        },
        organizationId,
      });
      unwrapMutationResult(result.logArmCircumference, "Failed to log arm circumference.");
      break;
    }
    case "thigh": {
      const result = await requestGraphql({
        document: LogThighCircumferenceMutation,
        variables: {
          input: { subjectId, thighCircumferenceCm: value, effectiveDateTime },
        },
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
