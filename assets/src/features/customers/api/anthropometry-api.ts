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

// ─── Types ───────────────────────────────────────────────────────────

/** A point-in-time snapshot of all anthropometric measurements for a person. */
export interface AnthropometricSnapshot {
  date: string;
  weight?: number;
  height?: number;
  bmi?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  arm?: number;
  thigh?: number;
}

/** Keys for circumference measurement fields on an anthropometric snapshot. */
export type CircumferenceKey = "chest" | "waist" | "hip" | "arm" | "thigh";

/** Form data for logging body height and weight. */
export interface AnthropometryFormData {
  heightCm: number | null;
  weightKg: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

type AnthropometryResult = ResultOf<typeof AnthropometryLatestQuery>;
type ObservationPage = AnthropometryResult["weight"];
type ObservationRecord = NonNullable<NonNullable<ObservationPage>["results"]>[number];

/** Parse the numeric value from a FHIR valueQuantity string, returning undefined on NaN or missing data. */
function extractValue(obs: ObservationRecord | undefined): number | undefined {
  if (!obs?.valueQuantity?.value) {
    return undefined;
  }
  const n = parseFloat(obs.valueQuantity.value);
  return Number.isNaN(n) ? undefined : n;
}

function extractDate(obs: ObservationRecord | undefined): string {
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

  const date =
    extractDate(weightRecord) ||
    extractDate(heightRecord) ||
    extractDate(bmiRecord) ||
    extractDate(chestRecord) ||
    extractDate(waistRecord) ||
    extractDate(hipRecord) ||
    extractDate(armRecord) ||
    extractDate(thighRecord);

  // A snapshot requires at least one observation at the given index.
  if (!date) {
    return null;
  }

  return {
    date,
    weight: extractValue(weightRecord),
    height: extractValue(heightRecord),
    bmi: extractValue(bmiRecord),
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
    1,
  );
  if (previous) {
    snapshots.push(previous);
  }

  return snapshots;
}

/**
 * Log body height and/or weight. Skips whichever value is absent.
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

  await Promise.all(promises);
}
