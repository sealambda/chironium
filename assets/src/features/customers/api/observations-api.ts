import { graphql, type ResultOf } from "@/graphql";
import * as m from "@/paraglide/messages";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Queries ─────────────────────────────────────────────────────────

const ListObservationsQuery = graphql(`
  query ListObservations(
    $filter: ObservationFilterInput!
    $sort: [ObservationSortInput]
    $first: Int
    $after: String
  ) {
    listObservations(filter: $filter, sort: $sort, first: $first, after: $after) {
      count
      results {
        id
        status
        code {
          coding {
            system
            code
            display
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
          authorReference
        }
      }
      endKeyset
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
          authorReference
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

const SNOMED_SYSTEM = "http://snomed.info/sct" as const;

/** Code text values used for diet observations — excluded from the general observations list. */
export const DIET_CODES = ["diet-inclusion", "diet-exclusion"] as const;

// ─── Types ───────────────────────────────────────────────────────────

/** Form data for the menstrual cycle onboarding step. */
export interface MenstrualCycleFormData {
  startDate: string;
  endDate: string;
  notes: string;
}

/** Form data for creating or editing a clinical note observation. */
export interface ClinicalNoteFormData {
  body: string;
}

/** Input for adding or replacing annotation notes on a resource. */
export interface AnnotationInput {
  text: string;
  authorReference?: string | null;
  authorString?: string | null;
  authorReference?: string | null;
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
        code: { coding: [{ system: SNOMED_SYSTEM, code: "364307006" }] },
        valueString: noteText,
        note: [{ text: noteText, authorString: userName, authorReference: userId, time: new Date().toISOString() }],
        subjectId,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.createObservation, "Failed to create menstrual cycle observation.");
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
            code: { text: "clinical-note" },
            valueString: note.body.trim(),
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

function isDietObservation(item: ObservationItem): boolean {
  return DIET_CODES.includes(item.code?.text as (typeof DIET_CODES)[number]);
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
    },
    organizationId,
  });

  const page = result.listObservations;
  const items = (page?.results ?? []).filter((item) => !isDietObservation(item));
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
    },
    organizationId,
  });

  const page = result.listObservations;
  const items = (page?.results ?? []).filter((item) => !isDietObservation(item));
  return {
    items,
    count: items.length,
    endKeyset: page?.endKeyset ?? null,
  };
}

/**
 * Fetch raw diet observations (diet-inclusion / diet-exclusion) for the history table.
 */
export async function fetchDietObservationsList(
  personId: string,
  organizationId: string,
): Promise<ObservationItem[]> {
  if (!personId || !organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: ListObservationsQuery,
    variables: {
      filter: buildSubjectFilter(personId),
      sort: SORT_NEWEST_FIRST,
      first: 250,
    },
    organizationId,
  });

  const allItems = result.listObservations?.results ?? [];
  return allItems.filter((item) =>
    DIET_CODES.includes(item.code?.text as (typeof DIET_CODES)[number]),
  );
}

// ─── Label helpers ───────────────────────────────────────────────────

const CODE_TEXT_LABELS: Record<string, () => string> = {
  "clinical-note": m.observations_type_clinical_note,
  "diet-inclusion": m.observations_type_diet_inclusion,
  "diet-exclusion": m.observations_type_diet_exclusion,
};

const CODING_LABELS: Record<string, () => string> = {
  "29463-7": m.observations_type_body_weight,
  "8302-2": m.observations_type_body_height,
  "364307006": m.observations_type_menstrual_cycle,
};

/** Derive a human-readable label from an observation's code. */
export function getObservationLabel(code: ObservationItem["code"]): string {
  if (!code) {
    return m.observations_type_default();
  }

  if (code.text && CODE_TEXT_LABELS[code.text]) {
    return CODE_TEXT_LABELS[code.text]();
  }

  const firstCoding = code.coding?.[0];
  if (firstCoding?.code && CODING_LABELS[firstCoding.code]) {
    return CODING_LABELS[firstCoding.code]();
  }

  return code.text ?? firstCoding?.display ?? m.observations_type_default();
}

/** Whether an observation is a clinical note (has title/body split and markdown body). */
export function isClinicalNote(obs: ObservationItem): boolean {
  return obs.code?.text === "clinical-note";
}

/** Parsed title + body from a clinical-note observation's valueString. */
export interface ParsedClinicalNote {
  title: string;
  body: string;
}

/**
 * Split a clinical-note valueString into title and body.
 * Parses both the current markdown format (`# Title\n\nBody`) and the
 * legacy colon format (`Title: Body`) for backward compatibility.
 */
export function parseClinicalNote(obs: ObservationItem): ParsedClinicalNote {
  const raw = obs.valueString ?? "";

  // Current format: "# Title\n\nBody"
  const mdMatch = raw.match(/^#\s+(.+?)\n+([\s\S]*)$/);
  if (mdMatch) {
    return { title: mdMatch[1].trim(), body: mdMatch[2].trim() };
  }

  // Legacy format: "Title: Body"
  const colonIdx = raw.indexOf(": ");
  if (colonIdx > 0 && colonIdx < 120) {
    return { title: raw.slice(0, colonIdx), body: raw.slice(colonIdx + 2) };
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
  return "\u2014";
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
    variables: { id, input: { valueString: data.body.trim() } },
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
          authorReference: n.authorReference ?? undefined,
          authorString: n.authorString ?? undefined,
          authorReference: n.authorReference ?? undefined,
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
