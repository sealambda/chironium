import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { graphql, type ResultOf } from "@/graphql";
import { getLocale } from "@/paraglide/runtime";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import { toDateTimeInput } from "@/shared/utils/date-time-input";
import { EMPTY_VALUE_PLACEHOLDER } from "@/shared/utils/display-value";

const SNOMED_SYSTEM = "http://snomed.info/sct" as const;

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

// ─── Queries ─────────────────────────────────────────────────────────

const ListObservationsQuery = graphql(`
  query ListObservations(
    $filter: ObservationFilterInput!
    $sort: [ObservationSortInput]
    $first: Int
    $after: String
    $locale: String
  ) {
    listObservations(
      filter: $filter
      sort: $sort
      first: $first
      after: $after
    ) {
      count
      results {
        id
        status
        code {
          coding {
            system
            code
            display(locale: $locale)
          }
          text
        }
        effectiveDateTime
        valueString
        valueQuantity {
          value
          unit
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
      endKeyset
    }
  }
`);

const ListMenstrualCycleObservationsQuery = graphql(`
  query ListMenstrualCycleObservations(
    $filter: ObservationFilterInput!
    $sort: [ObservationSortInput]
    $first: Int
  ) {
    starts: listMenstrualPeriodStartObservations(filter: $filter, sort: $sort, first: $first) {
      results {
        id
        effectiveDateTime
        valueDateTime
        note {
          text
          time
          authorReference
          authorString
        }
      }
    }
    durations: listMenstrualPeriodDurationObservations(
      filter: $filter
      sort: $sort
      first: $first
    ) {
      results {
        id
        effectiveDateTime
        valueQuantity {
          value
          unit
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

/** Form data for the menstrual cycle onboarding step. */
export interface MenstrualCycleFormData {
  startDate: string;
  endDate: string;
  notes: string;
}

/** Form data for recording a menstrual period from the person detail page. */
export interface MenstrualCycleRecordFormData {
  startDate: string;
  durationDays: number | null;
  notes: string;
}

/** Form data for creating or editing a clinical note observation. */
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

/** A single observation item returned by the list query. */
export type ObservationItem = NonNullable<
  NonNullable<ResultOf<typeof ListObservationsQuery>["listObservations"]>["results"]
>[number];

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
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Create a menstrual-cycle observation (SNOMED 364307006) combining dates and notes.
 */
export async function createMenstrualCycleObservation(
  data: MenstrualCycleFormData,
  subjectId: string,
  organizationId: string,
  userId: string,
  userName: string,
): Promise<void> {
  const fields: string[] = [];
  if (data.startDate) {
    fields.push(`start:${data.startDate}`);
  }
  if (data.endDate) {
    fields.push(`end:${data.endDate}`);
  }
  if (data.notes.trim()) {
    fields.push(`notes:${data.notes.trim()}`);
  }
  const noteText = fields.join("|");

  const result = await requestGraphql({
    document: CreateObservationMutation,
    variables: {
      input: {
        status: "FINAL",
        code: {
          coding: [{ system: SNOMED_SYSTEM, code: CODES.menstrualCycle }],
        },
        valueString: noteText,
        note: [
          {
            text: noteText,
            ...(userId ? { authorReference: userId } : { authorString: userName }),
            time: new Date().toISOString(),
          },
        ],
        subjectId,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.createObservation, "Failed to create menstrual cycle observation.");
}

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
 * Create one observation per clinical note. Skips entries where the body is empty.
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
      unwrapMutationResult(result.createObservation, "Failed to create clinical note observation.");
    }),
  );
}

// ─── List queries ────────────────────────────────────────────────────

const SORT_NEWEST_FIRST = [{ field: "EFFECTIVE_DATE_TIME" as const, order: "DESC" as const }];

function isDisplayable(item: ObservationItem): boolean {
  return !item.code || item.code.text === CODES.clinicalNote;
}

function isMenstrualCycleObservation(item: ObservationItem): boolean {
  return item.code?.coding?.some((coding) => coding.code === CODES.menstrualCycle) ?? false;
}

function buildSubjectFilter(personId: string) {
  return {
    status: { eq: "FINAL" as const },
    subject: { personId: { eq: personId } },
  };
}

/**
 * Fetch the latest observations for the summary card.
 */
export async function fetchObservationsSummary(
  personId: string,
  organizationId: string,
): Promise<ObservationsPage> {
  if (!personId || !organizationId) {
    return { items: [], count: 0, endKeyset: null };
  }

  const result = await requestGraphql({
    document: ListObservationsQuery,
    variables: {
      filter: buildSubjectFilter(personId),
      sort: SORT_NEWEST_FIRST,
      first: 3,
      locale: getLocale(),
    },
    organizationId,
  });

  const page = result.listObservations;
  const items = (page?.results ?? []).filter((item) => isDisplayable(item));
  return {
    items,
    count: items.length,
    endKeyset: page?.endKeyset ?? null,
  };
}

/**
 * Fetch all observations for the list page (up to 250).
 */
export async function fetchObservationsList(
  personId: string,
  organizationId: string,
): Promise<ObservationsPage> {
  if (!personId || !organizationId) {
    return { items: [], count: 0, endKeyset: null };
  }

  const result = await requestGraphql({
    document: ListObservationsQuery,
    variables: {
      filter: buildSubjectFilter(personId),
      sort: SORT_NEWEST_FIRST,
      first: 250,
      locale: getLocale(),
    },
    organizationId,
  });

  const page = result.listObservations;
  const items = (page?.results ?? []).filter((item) => isDisplayable(item));
  return {
    items,
    count: items.length,
    endKeyset: page?.endKeyset ?? null,
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

type MenstrualCycleObservationsResult = ResultOf<typeof ListMenstrualCycleObservationsQuery>;
type MenstrualPeriodStartRecord = NonNullable<
  NonNullable<MenstrualCycleObservationsResult["starts"]>["results"]
>[number];
type MenstrualPeriodDurationRecord = NonNullable<
  NonNullable<MenstrualCycleObservationsResult["durations"]>["results"]
>[number];

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

function summarizeFirstClassMenstrualCycle(
  data: MenstrualCycleObservationsResult,
): MenstrualCycleSummary | null {
  const startRecord = data.starts?.results?.[0];
  if (!startRecord) {
    return null;
  }
  return summarizeMenstrualCycleStart(startRecord, data.durations?.results ?? []);
}

function summarizeMenstrualCycleStart(
  startRecord: MenstrualPeriodStartRecord,
  durations: MenstrualPeriodDurationRecord[],
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
  };
}

export async function fetchLatestMenstrualCycle(
  personId: string,
  organizationId: string,
): Promise<MenstrualCycleSummary | null> {
  if (!personId || !organizationId) {
    return null;
  }

  const specializedResult = await requestGraphql({
    document: ListMenstrualCycleObservationsQuery,
    variables: {
      filter: buildSubjectFilter(personId),
      sort: SORT_NEWEST_FIRST,
      first: 10,
    },
    organizationId,
  });

  const specializedSummary = summarizeFirstClassMenstrualCycle(specializedResult);
  if (specializedSummary) {
    return specializedSummary;
  }

  const result = await requestGraphql({
    document: ListObservationsQuery,
    variables: {
      filter: buildSubjectFilter(personId),
      sort: SORT_NEWEST_FIRST,
      first: 250,
      locale: getLocale(),
    },
    organizationId,
  });

  const latest = (result.listObservations?.results ?? []).find((item) =>
    isMenstrualCycleObservation(item),
  );

  if (!latest) {
    return null;
  }

  const rawText = latest.valueString ?? latest.note?.[0]?.text ?? "";
  return parseMenstrualCycleSummary(rawText);
}

/** Parsed title + body from a clinical-note observation's valueString. */
export interface ParsedClinicalNote {
  title: string;
  body: string;
}

/**
 * Split a clinical-note valueString into title and body.
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

/** Get a plain display value for non-clinical-note observations. */
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
 * Update the valueString of a clinical-note observation.
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
  unwrapMutationResult(result.updateObservation, "Failed to update clinical note.");
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
