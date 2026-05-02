import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { codeInputFromTerminologyTag } from "@/features/customers/utils/terminology-code-mutation";
import { graphql, type VariablesOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import type { TerminologyTag } from "@/shared/types/terminology";
import { toUtcDateTimeStart } from "@/shared/utils/date-time-input";

import type { AnnotationInput } from "./observations-api";

// ─── Mutations ───────────────────────────────────────────────────────

const CreateConditionMutation = graphql(`
  mutation CreateCondition($input: CreateConditionInput!) {
    createCondition(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const UpdateConditionMutation = graphql(`
  mutation UpdateCondition($id: ID!, $input: UpdateConditionInput) {
    updateCondition(id: $id, input: $input) {
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

const DeleteConditionMutation = graphql(`
  mutation DeleteCondition($id: ID!) {
    deleteCondition(id: $id) {
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

/** One condition row returned by the patient query. */
export type { ConditionItem } from "./patients-api";

type CreateConditionInput = NonNullable<VariablesOf<typeof CreateConditionMutation>["input"]>;

export type ConditionClinicalStatus = NonNullable<CreateConditionInput["clinicalStatus"]>;

export type ConditionCreateOptions = Partial<
  Pick<
    CreateConditionInput,
    | "clinicalStatus"
    | "verificationStatus"
    | "onsetDateTime"
    | "onsetPeriod"
    | "abatementDateTime"
    | "abatementPeriod"
  >
>;

/** Form data for the pathologies (conditions) onboarding step. */
export interface PathologiesFormData {
  pathologies: TerminologyTag[];
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Create one Condition per tag.
 */
export async function createConditionsFromTags(
  tags: TerminologyTag[],
  patientId: string,
  organizationId: string,
  options: ConditionCreateOptions = {},
): Promise<void> {
  const makeRecord = (tag: TerminologyTag) =>
    (async () => {
      const result = await requestGraphql({
        document: CreateConditionMutation,
        variables: {
          input: {
            clinicalStatus: options.clinicalStatus ?? "ACTIVE",
            verificationStatus: options.verificationStatus ?? "CONFIRMED",
            onsetDateTime: options.onsetDateTime,
            onsetPeriod: options.onsetPeriod,
            abatementDateTime: options.abatementDateTime,
            abatementPeriod: options.abatementPeriod,
            subjectId: patientId,
            code: codeInputFromTerminologyTag(tag),
          },
        },
        organizationId,
      });
      unwrapMutationResult(result.createCondition, "Failed to create condition record.");
    })();

  await Promise.all(tags.map((tag) => makeRecord(tag)));
}

/**
 * Replaces annotation notes on a condition (full array required by the API).
 */
export async function updateConditionNotes(
  id: string,
  notes: AnnotationInput[],
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateConditionMutation,
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
  unwrapMutationResult(result.updateCondition, "Failed to update condition notes.");
}

/**
 * Updates display text for an uncoded condition (empty `code.coding`).
 */
export async function updateConditionCodeText(
  id: string,
  text: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateConditionMutation,
    variables: { id, input: { code: { text } } },
    organizationId,
  });
  unwrapMutationResult(result.updateCondition, "Failed to update condition.");
}

/** Updates condition code from a terminology tag (coded or free text). */
export async function updateConditionCodeFromTag(
  id: string,
  tag: TerminologyTag,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateConditionMutation,
    variables: { id, input: { code: codeInputFromTerminologyTag(tag) } },
    organizationId,
  });
  unwrapMutationResult(result.updateCondition, "Failed to update condition.");
}

/**
 * Permanently removes a condition record.
 */
export async function deleteCondition(id: string, organizationId: string): Promise<void> {
  const result = await requestGraphql({
    document: DeleteConditionMutation,
    variables: { id },
    organizationId,
  });
  unwrapMutationResult(result.deleteCondition, "Failed to delete condition.");
}

// ─── Detail update / soft removal ─────────────────────────────────────

type ConditionVerificationStatus = NonNullable<CreateConditionInput["verificationStatus"]>;

/**
 * Form values for the condition detail dialog. Date fields are ISO date
 * strings (`YYYY-MM-DD`); empty strings indicate the field was cleared.
 */
export interface ConditionFormInput {
  name: string;
  clinicalStatus: ConditionClinicalStatus;
  verificationStatus: ConditionVerificationStatus;
  onsetDate: string;
  abatementDate: string;
}

const ABATED_STATUSES: readonly ConditionClinicalStatus[] = ["INACTIVE", "REMISSION", "RESOLVED"];

function buildConditionInput(data: ConditionFormInput) {
  const abated = ABATED_STATUSES.includes(data.clinicalStatus);
  return {
    clinicalStatus: data.clinicalStatus,
    verificationStatus: data.verificationStatus,
    code: { text: data.name },
    onsetDateTime: toUtcDateTimeStart(data.onsetDate),
    abatementDateTime: abated ? toUtcDateTimeStart(data.abatementDate) : undefined,
  };
}

/** Update all clinical fields on an existing condition record. */
export async function updateCondition(
  id: string,
  data: ConditionFormInput,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateConditionMutation,
    variables: { id, input: buildConditionInput(data) },
    organizationId,
  });
  unwrapMutationResult(result.updateCondition, "Failed to update condition.");
}

/**
 * Soft-removes a condition by changing its verification status to indicate the
 * record was entered in error or has been clinically refuted.
 */
export async function removeCondition(
  id: string,
  reason: "ENTERED_IN_ERROR" | "REFUTED",
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateConditionMutation,
    variables: { id, input: { verificationStatus: reason } },
    organizationId,
  });
  unwrapMutationResult(result.updateCondition, "Failed to remove condition.");
}
