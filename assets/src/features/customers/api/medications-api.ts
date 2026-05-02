import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { codeInputFromTerminologyTag } from "@/features/customers/utils/terminology-code-mutation";
import { graphql, type VariablesOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import type { TerminologyTag } from "@/shared/types/terminology";
import { toUtcDateTimeEnd, toUtcDateTimeStart } from "@/shared/utils/date-time-input";

import type { AnnotationInput } from "./observations-api";

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
export type { MedicationItem } from "./patients-api";

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

/** Update name, course, effective period, and assertion date on a medication. */
export async function updateMedication(
  id: string,
  data: MedicationFormInput,
  organizationId: string,
): Promise<void> {
  const start = toUtcDateTimeStart(data.startDate);
  const end = data.course === "past" ? toUtcDateTimeEnd(data.endDate) : undefined;

  const result = await requestGraphql({
    document: UpdateMedicationStatementMutation,
    variables: {
      id,
      input: {
        medication: { text: data.name },
        effectivePeriod: start || end ? { start, end } : undefined,
        effectiveDateTime: undefined,
      },
    },
    organizationId,
  });
  unwrapMutationResult(result.updateMedicationStatement, "Failed to update medication.");
}
