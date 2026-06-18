import {
  isLegacyMenstrualCycleObservation,
  newestFirst,
  parseMenstrualCycleSummary,
  summarizeFirstClassMenstrualCycle,
  summarizeMenstrualCycleStart,
} from "@/features/customers/api/observations-api.menstrual";
import {
  CODES,
  CreateObservationMutation,
  DeleteObservationMutation,
  LogMenstrualPeriodDurationMutation,
  LogMenstrualPeriodStartMutation,
  UpdateObservationMutation,
} from "@/features/customers/api/observations-api.queries";
import type {
  ClinicalNoteFormData,
  MenstrualCycleEntry,
  MenstrualCycleRecordFormData,
  MenstrualCycleSummary,
  ObservationItem,
  ObservationsPage,
} from "@/features/customers/api/observations-api.types";
import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import { toDateTimeInput } from "@/shared/utils/date-time-input";

export type {
  ClinicalNoteFormData,
  MenstrualCycleEntry,
  MenstrualCycleRecordFormData,
  MenstrualCycleSummary,
  ObservationItem,
  ObservationsPage,
} from "@/features/customers/api/observations-api.types";

// ─── Functions ───────────────────────────────────────────────────────

function buildObservationNoteInput(text: string, userId: string, userName: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }

  return [
    {
      text: trimmed,
      ...toAuthorInput({
        authorReference: userId || null,
        authorString: userName || null,
      }),
      time: new Date().toISOString(),
    },
  ];
}

/**
 * Log a menstrual period using the first-class period start and duration actions.
 */
export async function logMenstrualCycle(
  data: MenstrualCycleRecordFormData,
  subjectId: string,
  organizationId: string,
  userId: string,
  userName: string,
): Promise<void> {
  const startDate = data.startDate.trim();
  if (!startDate) {
    return;
  }

  const effectiveDateTime = toDateTimeInput(startDate, null);
  if (!effectiveDateTime) {
    throw new Error(`Menstrual period start date "${startDate}" is not a valid date.`);
  }

  const note = buildObservationNoteInput(data.notes, userId, userName);
  const startResult = await requestGraphql({
    document: LogMenstrualPeriodStartMutation,
    variables: {
      input: {
        subjectId,
        effectiveDateTime,
        note,
      },
    },
    organizationId,
  });
  unwrapMutationResult(startResult.logMenstrualPeriodStart, "Failed to log period start.");

  if (data.durationDays != null && data.durationDays > 0) {
    const durationResult = await requestGraphql({
      document: LogMenstrualPeriodDurationMutation,
      variables: {
        input: {
          subjectId,
          effectiveDateTime,
          durationDays: data.durationDays,
        },
      },
      organizationId,
    });
    unwrapMutationResult(
      durationResult.logMenstrualPeriodDuration,
      "Failed to log period duration.",
    );
  }
}

/**
 * Update a previously logged menstrual cycle.
 */
export async function updateMenstrualCycle(
  data: MenstrualCycleRecordFormData,
  cycle: Pick<MenstrualCycleSummary, "startObservationId" | "durationObservationId">,
  subjectId: string,
  organizationId: string,
  userId: string,
  userName: string,
): Promise<void> {
  const startDate = data.startDate.trim();
  if (!startDate) {
    return;
  }

  const startObservationId = cycle.startObservationId;
  if (!startObservationId) {
    throw new Error("Menstrual cycle update failed: missing period-start observation id.");
  }

  const effectiveDateTime = toDateTimeInput(startDate, null);
  if (!effectiveDateTime) {
    throw new Error(`Menstrual period start date "${startDate}" is not a valid date.`);
  }

  const note = buildObservationNoteInput(data.notes, userId, userName);
  const startResult = await requestGraphql({
    document: UpdateObservationMutation,
    variables: {
      id: startObservationId,
      input: {
        effectiveDateTime,
        valueDateTime: effectiveDateTime,
        note,
      },
    },
    organizationId,
  });
  unwrapMutationResult(startResult.updateObservation, "Failed to update period start.");

  const durationObservationId = cycle.durationObservationId;
  if (data.durationDays != null && data.durationDays > 0) {
    if (durationObservationId) {
      const durationUpdateResult = await requestGraphql({
        document: UpdateObservationMutation,
        variables: {
          id: durationObservationId,
          input: {
            effectiveDateTime,
            valueQuantity: {
              system: "http://unitsofmeasure.org",
              code: "d",
              value: data.durationDays,
            },
          },
        },
        organizationId,
      });
      unwrapMutationResult(
        durationUpdateResult.updateObservation,
        "Failed to update period duration.",
      );
      return;
    }

    const durationCreateResult = await requestGraphql({
      document: LogMenstrualPeriodDurationMutation,
      variables: {
        input: {
          subjectId,
          effectiveDateTime,
          durationDays: data.durationDays,
        },
      },
      organizationId,
    });
    unwrapMutationResult(
      durationCreateResult.logMenstrualPeriodDuration,
      "Failed to update period duration.",
    );
    return;
  }

  if (durationObservationId) {
    await deleteObservation(durationObservationId, organizationId);
  }
}

/**
 * Create one free-text observation per non-empty body.
 */
export async function createClinicalNoteObservations(
  notes: ClinicalNoteFormData[],
  subjectId: string,
  organizationId: string,
): Promise<void> {
  const validNotes = notes.filter((n) => n.body.trim());

  await Promise.all(
    validNotes.map(async (note) => {
      const result = await requestGraphql({
        document: CreateObservationMutation,
        variables: {
          input: {
            status: "FINAL",
            code: { text: CODES.clinicalNote },
            valueString: note.body.trim(),
            effectiveDateTime: toDateTimeInput(note.effectiveDate, note.effectiveTime),
            subjectId,
          },
        },
        organizationId,
      });
      unwrapMutationResult(result.createObservation, "Failed to create free-text observation.");
    }),
  );
}

// ─── Patient observation selectors ───────────────────────────────────

function isDisplayable(item: ObservationItem): boolean {
  return !item.code || item.code.text === CODES.clinicalNote;
}

/**
 * Select all observations for the list page.
 */
export function selectObservationsList(
  observations: readonly ObservationItem[] | null | undefined,
): ObservationsPage {
  const items = newestFirst(observations ?? []).filter(
    (item) => item.status === "FINAL" && isDisplayable(item),
  );
  return {
    items,
    count: items.length,
    endKeyset: null,
  };
}

export function selectLatestMenstrualCycle(
  observations: readonly ObservationItem[] | null | undefined,
): MenstrualCycleSummary | null {
  const records = newestFirst(observations ?? []);
  const starts = records.filter((item) => item.observationType === "MENSTRUAL_PERIOD_START");
  const durations = records.filter((item) => item.observationType === "MENSTRUAL_PERIOD_DURATION");
  const specializedSummary = summarizeFirstClassMenstrualCycle(starts, durations);
  if (specializedSummary) {
    return specializedSummary;
  }

  const latest = records.find((item) => isLegacyMenstrualCycleObservation(item));

  if (!latest) {
    return null;
  }

  const rawText = latest.valueString ?? latest.note?.[0]?.text ?? "";
  return {
    ...parseMenstrualCycleSummary(rawText),
    startObservationId: latest.id,
    durationObservationId: null,
    sourceNotes: latest.note,
    paperTrailVersions: latest.paperTrailVersions,
  };
}

/**
 * Fetch every menstrual period start observation for the patient and pair each
 * with its matching duration record (if logged on the same day). Also includes
 * legacy SNOMED observations stored as pipe-delimited valueStrings.
 *
 * Used by the activity feed to render one event per cycle.
 */
export function selectMenstrualCycleHistory(
  observations: readonly ObservationItem[] | null | undefined,
): MenstrualCycleEntry[] {
  const records = newestFirst(observations ?? []);
  const starts = records.filter((item) => item.observationType === "MENSTRUAL_PERIOD_START");
  const durations = records.filter((item) => item.observationType === "MENSTRUAL_PERIOD_DURATION");
  const legacyRecords = records.filter((item) => isLegacyMenstrualCycleObservation(item));

  const entries: MenstrualCycleEntry[] = [];

  for (const start of starts) {
    const summary = summarizeMenstrualCycleStart(start, durations);
    if (!summary) {
      continue;
    }
    const effectiveDateTime = start.valueDateTime ?? start.effectiveDateTime;
    if (!effectiveDateTime) {
      continue;
    }
    entries.push({ ...summary, id: start.id, effectiveDateTime });
  }

  for (const legacy of legacyRecords) {
    const effectiveDateTime = legacy.effectiveDateTime;
    if (!effectiveDateTime) {
      continue;
    }
    const rawText = legacy.valueString ?? legacy.note?.[0]?.text ?? "";
    entries.push({
      ...parseMenstrualCycleSummary(rawText),
      startObservationId: legacy.id,
      durationObservationId: null,
      sourceNotes: legacy.note,
      paperTrailVersions: legacy.paperTrailVersions,
      id: legacy.id,
      effectiveDateTime,
    });
  }

  return newestFirst(entries);
}

// ─── Mutation functions ───────────────────────────────────────────────

/**
 * Update the valueString of a free-text observation.
 * Only updates the observation value — does not modify the note annotation array.
 */
export async function updateClinicalNoteObservation(
  id: string,
  data: ClinicalNoteFormData,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateObservationMutation,
    variables: {
      id,
      input: {
        valueString: data.body.trim(),
        effectiveDateTime: toDateTimeInput(data.effectiveDate, data.effectiveTime),
      },
    },
    organizationId,
  });
  unwrapMutationResult(result.updateObservation, "Failed to update free-text observation.");
}

/**
 * Permanently delete an observation by ID.
 */
export async function deleteObservation(id: string, organizationId: string): Promise<void> {
  const result = await requestGraphql({
    document: DeleteObservationMutation,
    variables: { id },
    organizationId,
  });
  unwrapMutationResult(result.deleteObservation, "Failed to delete observation.");
}
