import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { codeInputFromTerminologyTag } from "@/features/customers/utils/terminology-code-mutation";
import { graphql, type ResultOf, type VariablesOf } from "@/graphql";
import { getLocale } from "@/paraglide/runtime";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import type { TerminologyTag } from "@/shared/types/terminology";

import type { AnnotationInput } from "./observations-api";

// ─── Queries ─────────────────────────────────────────────────────────

const GetPatientMedicationsQuery = graphql(`
  query GetPatientMedications($patientId: ID!, $locale: String) {
    getPatient(id: $patientId) {
      medicationStatements {
        id
        status
        medication {
          text
          coding {
            system
            code
            version
            display(locale: $locale)
          }
        }
        effectiveDateTime
        effectivePeriod {
          start
          end
        }
        dateAsserted
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

const CreateMedicationStatementMutation = graphql(`
  mutation CreateMedicationStatement($input: CreateMedicationStatementInput!) {
    createMedicationStatement(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const UpdateMedicationStatementMutation = graphql(`
  mutation UpdateMedicationStatement($id: ID!, $input: UpdateMedicationStatementInput) {
    updateMedicationStatement(id: $id, input: $input) {
      result {
        id
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

const DeleteMedicationStatementMutation = graphql(`
  mutation DeleteMedicationStatement($id: ID!) {
    deleteMedicationStatement(id: $id) {
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

/** One row in the patient's medications list (FHIR MedicationStatement). */
export type MedicationItem = NonNullable<
  NonNullable<ResultOf<typeof GetPatientMedicationsQuery>["getPatient"]>["medicationStatements"]
>[number];

type CreateMedicationStatementInput = NonNullable<
  VariablesOf<typeof CreateMedicationStatementMutation>["input"]
>;

export type MedicationCreateOptions = Partial<
  Pick<
    CreateMedicationStatementInput,
    "status" | "effectiveDateTime" | "effectivePeriod" | "dateAsserted"
  >
>;

/** Form data for the medications onboarding step. */
export interface MedicationsFormData {
  medications: TerminologyTag[];
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Fetch all medications for a patient.
 */
export async function fetchMedications(
  patientId: string,
  organizationId: string,
): Promise<MedicationItem[]> {
  if (!patientId || !organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: GetPatientMedicationsQuery,
    variables: { patientId, locale: getLocale() },
    organizationId,
  });

  return result.getPatient?.medicationStatements ?? [];
}

/**
 * Create one MedicationStatement per tag.
 */
export async function createMedicationsFromTags(
  tags: TerminologyTag[],
  patientId: string,
  organizationId: string,
  options: MedicationCreateOptions = {},
): Promise<void> {
  const makeRecord = (tag: TerminologyTag) =>
    (async () => {
      const result = await requestGraphql({
        document: CreateMedicationStatementMutation,
        variables: {
          input: {
            status: options.status ?? "RECORDED",
            effectiveDateTime: options.effectiveDateTime,
            effectivePeriod: options.effectivePeriod,
            dateAsserted: options.dateAsserted,
            subjectId: patientId,
            medication: codeInputFromTerminologyTag(tag),
          },
        },
        organizationId,
      });
      unwrapMutationResult(result.createMedicationStatement, "Failed to create medication record.");
    })();

  await Promise.all(tags.map((tag) => makeRecord(tag)));
}

/**
 * Replaces annotation notes on a medication (full array required by the API).
 */
export async function updateMedicationNotes(
  id: string,
  notes: AnnotationInput[],
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateMedicationStatementMutation,
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
  unwrapMutationResult(result.updateMedicationStatement, "Failed to update medication notes.");
}

/**
 * Updates display text for an uncoded medication (empty `code.coding`).
 */
export async function updateMedicationCodeText(
  id: string,
  text: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateMedicationStatementMutation,
    variables: { id, input: { medication: { text } } },
    organizationId,
  });
  unwrapMutationResult(result.updateMedicationStatement, "Failed to update medication.");
}

export async function updateMedicationCodeFromTag(
  id: string,
  tag: TerminologyTag,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateMedicationStatementMutation,
    variables: { id, input: { medication: codeInputFromTerminologyTag(tag) } },
    organizationId,
  });
  unwrapMutationResult(result.updateMedicationStatement, "Failed to update medication.");
}

/**
 * Permanently removes a medication statement.
 */
export async function deleteMedicationStatement(id: string, organizationId: string): Promise<void> {
  const result = await requestGraphql({
    document: DeleteMedicationStatementMutation,
    variables: { id },
    organizationId,
  });
  unwrapMutationResult(result.deleteMedicationStatement, "Failed to delete medication.");
}

// ─── Detail update ────────────────────────────────────────────────────

/**
 * Form values for the medication detail dialog. Date fields are ISO date
 * strings (`YYYY-MM-DD`); empty strings indicate the field was cleared.
 */
export interface MedicationFormInput {
  name: string;
  course: "current" | "past";
  startDate: string;
  endDate: string;
}

function dateInputToUtcStart(value: string): string | null {
  return value ? `${value}T09:00:00.000Z` : null;
}

function dateInputToUtcEnd(value: string): string | null {
  return value ? `${value}T23:59:59.999Z` : null;
}

/** Update name, course, effective period, and assertion date on a medication. */
export async function updateMedication(
  id: string,
  data: MedicationFormInput,
  organizationId: string,
): Promise<void> {
  const start = dateInputToUtcStart(data.startDate);
  const end = data.course === "past" ? dateInputToUtcEnd(data.endDate) : null;
  const hasPeriod = start !== null || end !== null;

  const result = await requestGraphql({
    document: UpdateMedicationStatementMutation,
    variables: {
      id,
      input: {
        medication: { text: data.name },
        // Send explicit nulls so cleared dates and switching effectiveDateTime <-> effectivePeriod
        // overwrite previous values instead of leaving them in place.
        effectivePeriod: hasPeriod ? { start, end } : null,
        effectiveDateTime: null,
      },
    },
    organizationId,
  });
  unwrapMutationResult(result.updateMedicationStatement, "Failed to update medication.");
}
