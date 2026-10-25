import { format, parseISO } from "date-fns";

import type {
  AnthropometricSnapshot,
  AnthropometryAnnotation,
  AnthropometryObservationKey,
  AnthropometryObservationRef,
} from "@/features/customers/api/anthropometry-api";
import { CIRCUMFERENCE_KEYS } from "@/features/customers/api/anthropometry-api";
import { extractValue } from "@/features/customers/api/anthropometry-api.helpers";
import type { PatientObservation } from "@/features/customers/api/patients-api";
import { inZone } from "@/shared/utils/date-time-input";

const ANTHROPOMETRY_OBSERVATION_KEYS: readonly AnthropometryObservationKey[] = [
  "weight",
  "height",
  "bmi",
  "whr",
  ...CIRCUMFERENCE_KEYS,
];

type ObservationRecord = PatientObservation;

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
    selfReported: obs.selfReported === true,
  };
}

/**
 * Select the full anthropometric history from patient observations.
 *
 * Observations are grouped by calendar date in `timeZone` (the organization's, matching how the
 * server derives BMI per day) so measurements recorded on different days are never merged into
 * the same snapshot. Returns snapshots sorted DESC by date — consumers that
 * only need the latest entries can read `result[0]` (most recent) and `result[1]` (previous).
 */
export function selectAnthropometryHistory(
  observations: readonly ObservationRecord[] | null | undefined,
  timeZone?: string,
): AnthropometricSnapshot[] {
  const toDateKey = (dt: string): string => format(parseISO(dt), "yyyy-MM-dd", inZone(timeZone));

  // Accumulate one snapshot per calendar date.
  const byDate = new Map<string, AnthropometricSnapshot>();
  // Sort key of the observation each field currently holds, per date.
  const fieldOrder = new Map<string, string>();

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
    // A day can hold several values for one field; show the latest, as the server does for BMI.
    const order = `${dt}|${obs.id ?? ""}`;
    const fieldKey = `${key}:${field}`;
    if ((fieldOrder.get(fieldKey) ?? "") > order) {
      continue;
    }
    fieldOrder.set(fieldKey, order);
    mergeObservation(snapshot, field, obs, dt);
  }

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/** Keys of the snapshot's values that the patient reported themselves, in display order. */
export function selfReportedAnthropometryKeys(
  snapshot: AnthropometricSnapshot,
): AnthropometryObservationKey[] {
  return ANTHROPOMETRY_OBSERVATION_KEYS.filter(
    (key) => snapshot[key] != null && snapshot.observations?.[key]?.selfReported === true,
  );
}

/**
 * Build a combined "current state" snapshot by picking the most recent value for each
 * measurement field across the full history. The date reflects the most recent weight
 * observation so the hero section shows accurate recency.
 */
export function selectCurrentStateSnapshot(
  history: AnthropometricSnapshot[],
): AnthropometricSnapshot | null {
  const firstSnapshot = history.at(0);
  if (!firstSnapshot) {
    return null;
  }

  const merged: AnthropometricSnapshot = {
    date: (history.find((s) => s.weight != null) ?? firstSnapshot).date,
    observations: {},
  };

  // Each field keeps the observation it came from, so provenance (e.g. self-reported)
  // follows the value into the combined snapshot.
  for (const key of ANTHROPOMETRY_OBSERVATION_KEYS) {
    const source = history.find((snapshot) => snapshot[key] != null);
    if (!source) {
      continue;
    }
    merged[key] = source[key];
    const ref = source.observations?.[key];
    if (ref && merged.observations) {
      merged.observations[key] = ref;
    }
  }

  return merged;
}
