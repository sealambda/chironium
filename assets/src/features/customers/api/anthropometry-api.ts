import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Queries ─────────────────────────────────────────────────────────

const AnthropometryLatestQuery = graphql(`
  query AnthropometryLatest(
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
      }
    }
    height: listBodyHeightObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
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
      }
    }
    chest: listChestCircumferenceObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
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
      }
    }
    hip: listHipCircumferenceObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
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
      }
    }
    thigh: listThighCircumferenceObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
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

// ─── Types ───────────────────────────────────────────────────────────

/** A point-in-time snapshot of all anthropometric measurements for a person. */
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
}

/** Keys for circumference measurement fields on an anthropometric snapshot. */
export type CircumferenceKey = "chest" | "waist" | "hip" | "arm" | "thigh";

/** Form data for logging body measurements during onboarding. */
export interface AnthropometryFormData {
  heightCm: number | null;
  weightKg: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

type AnthropometryResult = ResultOf<typeof AnthropometryLatestQuery>;
type ObservationPage = AnthropometryResult["weight"];
type ObservationRecord = NonNullable<NonNullable<ObservationPage>["results"]>[number];

/** Parse the numeric value from a FHIR valueQuantity string, returning undefined on NaN or missing data. */
export function extractValue(obs: ObservationRecord | undefined): number | undefined {
  if (!obs?.valueQuantity?.value) {
    return undefined;
  }
  const n = parseFloat(obs.valueQuantity.value);
  return Number.isNaN(n) ? undefined : n;
}

export function extractDate(obs: ObservationRecord | undefined): string {
  return obs?.effectiveDateTime ?? "";
}

/**
 * Assemble a snapshot from parallel observation pages at the given index.
 * Returns null if no measurement exists at that position across all pages.
 */
function buildSnapshot(
  weight: ObservationPage,
  height: ObservationPage,
  bmi: ObservationPage,
  chest: ObservationPage,
  waist: ObservationPage,
  hip: ObservationPage,
  arm: ObservationPage,
  thigh: ObservationPage,
  whr: ObservationPage,
  index: number,
): AnthropometricSnapshot | null {
  const weightRecord = weight?.results?.[index];
  const heightRecord = height?.results?.[index];
  const bmiRecord = bmi?.results?.[index];
  const chestRecord = chest?.results?.[index];
  const waistRecord = waist?.results?.[index];
  const hipRecord = hip?.results?.[index];
  const armRecord = arm?.results?.[index];
  const thighRecord = thigh?.results?.[index];
  const whrRecord = whr?.results?.[index];

  const date =
    extractDate(weightRecord) ||
    extractDate(heightRecord) ||
    extractDate(bmiRecord) ||
    extractDate(chestRecord) ||
    extractDate(waistRecord) ||
    extractDate(hipRecord) ||
    extractDate(armRecord) ||
    extractDate(thighRecord) ||
    extractDate(whrRecord);

  // A snapshot requires at least one observation at the given index.
  if (!date) {
    return null;
  }

  return {
    date,
    weight: extractValue(weightRecord),
    height: extractValue(heightRecord),
    bmi: extractValue(bmiRecord),
    whr: extractValue(whrRecord),
    chest: extractValue(chestRecord),
    waist: extractValue(waistRecord),
    hip: extractValue(hipRecord),
    arm: extractValue(armRecord),
    thigh: extractValue(thighRecord),
  };
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Fetch the two most recent anthropometric snapshots for a person.
 * Returns [latest, previous] — used for delta calculations in the UI.
 */
export async function fetchAnthropometry(
  personId: string,
  organizationId: string,
): Promise<AnthropometricSnapshot[]> {
  if (!personId || !organizationId) {
    return [];
  }

  const data = await requestGraphql({
    document: AnthropometryLatestQuery,
    variables: {
      filter: { subject: { personId: { eq: personId } } },
      sort: [{ field: "EFFECTIVE_DATE_TIME", order: "DESC" }],
      first: 2,
    },
    organizationId,
  });

  const snapshots: AnthropometricSnapshot[] = [];

  const latest = buildSnapshot(
    data.weight,
    data.height,
    data.bmi,
    data.chest,
    data.waist,
    data.hip,
    data.arm,
    data.thigh,
    data.whr,
    0,
  );
  if (latest) {
    snapshots.push(latest);
  }

  const previous = buildSnapshot(
    data.weight,
    data.height,
    data.bmi,
    data.chest,
    data.waist,
    data.hip,
    data.arm,
    data.thigh,
    data.whr,
    1,
  );
  if (previous) {
    snapshots.push(previous);
  }

  return snapshots;
}

/**
 * Fetch full anthropometric history for a person (up to 250 records per measurement type).
 * Observations are grouped by calendar date so that measurements recorded on different
 * days are never merged into the same snapshot.
 * Returns snapshots sorted DESC by date.
 */
export async function fetchAnthropometryHistory(
  personId: string,
  organizationId: string,
): Promise<AnthropometricSnapshot[]> {
  if (!personId || !organizationId) {
    return [];
  }

  const data = await requestGraphql({
    document: AnthropometryLatestQuery,
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

  const merge = (
    page: ObservationPage,
    field: keyof Omit<AnthropometricSnapshot, "date">,
  ) => {
    for (const obs of page?.results ?? []) {
      const dt = obs?.effectiveDateTime;
      if (!dt) continue;
      const key = toDateKey(dt);
      if (!byDate.has(key)) {
        byDate.set(key, { date: dt });
      }
      const snapshot = byDate.get(key)!;
      // Keep the most precise datetime seen for this date.
      if (dt > snapshot.date) snapshot.date = dt;
      const value = extractValue(obs);
      if (value !== undefined) {
        (snapshot[field] as number | undefined) = value;
      }
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
  const promises: Promise<void>[] = [];

  if (data.heightCm && data.heightCm > 0) {
    const heightCm = data.heightCm;
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: LogBodyHeightMutation,
          variables: { input: { subjectId, heightCm } },
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
          variables: { input: { subjectId, weightKg } },
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
          variables: { input: { subjectId, chestCircumferenceCm } },
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
          variables: { input: { subjectId, waistCircumferenceCm } },
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
          variables: { input: { subjectId, hipCircumferenceCm } },
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
          variables: { input: { subjectId, armCircumferenceCm } },
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
          variables: { input: { subjectId, thighCircumferenceCm } },
          organizationId,
        });
        unwrapMutationResult(result.logThighCircumference, "Failed to log thigh circumference.");
      })(),
    );
  }

  await Promise.all(promises);
}
