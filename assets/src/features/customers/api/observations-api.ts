import type { PatientObservation } from "@/features/customers/api/patients-api";
import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import { toDateTimeInput } from "@/shared/utils/date-time-input";
import { EMPTY_VALUE_PLACEHOLDER } from "@/shared/utils/display-value";

type CodeTypes =
  | "clinicalNote"
  | "dietInclusion"
  | "dietExclusion"
  | "menstrualCycle"
  | "bodyWeight"
  | "bodyHeight";

const CODES: Record<CodeTypes, string> = {
  clinicalNote: "clinical-note",
  dietInclusion: "diet-inclusion",
  dietExclusion: "diet-exclusion",
  menstrualCycle: "364307006",
  bodyWeight: "29463-7",
  bodyHeight: "8302-2",
};

// ─── Mutations ───────────────────────────────────────────────────────

const CreateObservationMutation = graphql(`
  mutation CreateObservation($input: CreateObservationInput!) {
    createObservation(input: $input) {
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

const LogMenstrualPeriodStartMutation = graphql(`
  mutation LogMenstrualPeriodStart($input: LogMenstrualPeriodStartInput!) {
    logMenstrualPeriodStart(input: $input) {
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

const LogMenstrualPeriodDurationMutation = graphql(`
  mutation LogMenstrualPeriodDuration($input: LogMenstrualPeriodDurationInput!) {
    logMenstrualPeriodDuration(input: $input) {
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

const UpdateObservationMutation = graphql(`
  mutation UpdateObservation($id: ID!, $input: UpdateObservationInput) {
    updateObservation(id: $id, input: $input) {
      result {
        id
        valueString
        note {
          text
          time
          authorReference
          authorString
        }
      }
      errors {
        message
      }
    }
  }
`);

const DeleteObservationMutation = graphql(`
  mutation DeleteObservation($id: ID!) {
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

/** Form data for recording a menstrual period from the person detail page. */
export interface MenstrualCycleRecordFormData {
  startDate: string;
  durationDays: number | null;
  notes: string;
}

/** Form data for creating or editing a free-text observation. */
export interface ClinicalNoteFormData {
  body: string;
  effectiveDate?: string | null;
  effectiveTime?: string | null;
}

/** Input for adding or replacing annotation notes on a resource. */
export interface AnnotationInput {
  text: string;
  authorReference?: string | null;
  authorString?: string | null;
  time?: string | null;
}

/** A single observation item returned by the centralized patient query. */
export type ObservationItem = PatientObservation;

/** Paginated observations result. */
export interface ObservationsPage {
  items: ObservationItem[];
  count: number;
  endKeyset: string | null;
}

export interface MenstrualCycleSummary {
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  notes: string | null;
  sourceNotes?: ObservationItem["note"] | null;
  paperTrailVersions?: ObservationItem["paperTrailVersions"] | null;
}

/** A single menstrual cycle event identified by the period-start observation. */
export interface MenstrualCycleEntry extends MenstrualCycleSummary {
  /** ID of the underlying period-start observation. */
  id: string;
  /** Period-start timestamp suitable for ordering feed events. */
  effectiveDateTime: string;
}

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

function isLegacyMenstrualCycleObservation(item: ObservationItem): boolean {
  return item.code?.coding?.some((coding) => coding.code === CODES.menstrualCycle) ?? false;
}

function newestFirst<T extends { effectiveDateTime?: string | null }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) =>
    (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? ""),
  );
}

/**
 * Select the latest observations for the summary card.
 */
export function selectObservationsSummary(
  observations: readonly ObservationItem[] | null | undefined,
): ObservationsPage {
  const items = newestFirst(observations ?? [])
    .filter((item) => item.status === "FINAL" && isDisplayable(item))
    .slice(0, 3);
  return {
    items,
    count: items.length,
    endKeyset: null,
  };
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

function parseMenstrualCycleSummary(rawText: string): MenstrualCycleSummary {
  const fields = rawText.split("|");

  let startDate: string | null = null;
  let endDate: string | null = null;
  let notes: string | null = null;

  for (const field of fields) {
    const trimmed = field.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.startsWith("start:")) {
      const value = trimmed.slice("start:".length).trim();
      startDate = value || null;
      continue;
    }
    if (trimmed.startsWith("end:")) {
      const value = trimmed.slice("end:".length).trim();
      endDate = value || null;
      continue;
    }
    if (trimmed.startsWith("notes:")) {
      const value = trimmed.slice("notes:".length).trim();
      notes = value || null;
    }
  }

  return { startDate, endDate, durationDays: null, notes };
}

type MenstrualPeriodStartRecord = ObservationItem;
type MenstrualPeriodDurationRecord = ObservationItem;

function toDateOnly(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}

function parseDurationDays(value: string | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  const durationDays = Number.parseInt(String(value), 10);
  return Number.isFinite(durationDays) ? durationDays : null;
}

function addInclusiveDuration(startDate: string, durationDays: number): string | null {
  if (durationDays < 1) {
    return null;
  }

  const date = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + durationDays - 1);
  return date.toISOString().slice(0, 10);
}

function firstNoteText(
  ...records: Array<{ note?: readonly { text?: string | null }[] | null } | null | undefined>
): string | null {
  for (const record of records) {
    const text = record?.note?.find((note) => note.text?.trim())?.text?.trim();
    if (text) {
      return text;
    }
  }
  return null;
}

function firstNoteSource(
  ...records: Array<{ note?: ObservationItem["note"] | null } | null | undefined>
): ObservationItem["note"] | null {
  for (const record of records) {
    if (record?.note?.length) {
      return record.note;
    }
  }
  return null;
}

function summarizeFirstClassMenstrualCycle(
  starts: readonly MenstrualPeriodStartRecord[],
  durations: readonly MenstrualPeriodDurationRecord[],
): MenstrualCycleSummary | null {
  const startRecord = starts[0];
  if (!startRecord) {
    return null;
  }
  return summarizeMenstrualCycleStart(startRecord, durations);
}

function summarizeMenstrualCycleStart(
  startRecord: MenstrualPeriodStartRecord,
  durations: readonly MenstrualPeriodDurationRecord[],
): MenstrualCycleSummary | null {
  const startDate = toDateOnly(startRecord.valueDateTime ?? startRecord.effectiveDateTime);
  if (!startDate) {
    return null;
  }

  const matchingDuration = durations.find(
    (record) => toDateOnly(record.effectiveDateTime) === startDate,
  );
  const durationDays = parseDurationDays(matchingDuration?.valueQuantity?.value);

  return {
    startDate,
    endDate: durationDays != null ? addInclusiveDuration(startDate, durationDays) : null,
    durationDays,
    notes: firstNoteText(startRecord, matchingDuration),
    sourceNotes: firstNoteSource(startRecord, matchingDuration),
    paperTrailVersions: startRecord.paperTrailVersions ?? matchingDuration?.paperTrailVersions,
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
    sourceNotes: latest.note,
    paperTrailVersions: latest.paperTrailVersions,
  };
}

/**
 * Fetch every menstrual period start observation for the patient and pair each
 * with its matching duration record (if logged on the same day).
 *
 * Used by the activity feed to render one event per cycle.
 */
export function selectMenstrualCycleHistory(
  observations: readonly ObservationItem[] | null | undefined,
): MenstrualCycleEntry[] {
  const records = newestFirst(observations ?? []);
  const starts = records.filter((item) => item.observationType === "MENSTRUAL_PERIOD_START");
  const durations = records.filter((item) => item.observationType === "MENSTRUAL_PERIOD_DURATION");

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
  return entries;
}

/** Parsed title and body from a free-text observation's valueString. */
export interface ParsedClinicalNote {
  title: string;
  body: string;
}

/**
 * Split a free-text observation valueString into title and body.
 * Expected format: `# Title\n\nBody`.
 */
export function parseClinicalNote(obs: ObservationItem): ParsedClinicalNote {
  const raw = obs.valueString ?? "";

  const mdMatch = /^#\s+(.+?)\n+([\s\S]*)$/.exec(raw);
  if (mdMatch?.[1] !== undefined && mdMatch[2] !== undefined) {
    return { title: mdMatch[1].trim(), body: mdMatch[2].trim() };
  }

  return { title: raw, body: "" };
}

/** Get a plain display value for typed observations. */
export function getObservationDisplayValue(obs: ObservationItem): string {
  if (obs.valueString) {
    return obs.valueString;
  }
  if (obs.valueQuantity?.value != null) {
    const unit = obs.valueQuantity.unit ? ` ${obs.valueQuantity.unit}` : "";
    return `${obs.valueQuantity.value}${unit}`;
  }
  return EMPTY_VALUE_PLACEHOLDER;
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
 * Replace the annotation notes array on an observation.
 * Sends the full notes array — partial updates are not supported by the API.
 */
export async function updateObservationNotes(
  id: string,
  notes: AnnotationInput[],
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateObservationMutation,
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
  unwrapMutationResult(result.updateObservation, "Failed to update observation notes.");
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
