import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { codeInputFromTerminologyTag } from "@/features/customers/utils/terminology-code-mutation";
import { graphql, type ResultOf } from "@/graphql";
import { getLocale } from "@/paraglide/runtime";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import type { TerminologyTag } from "@/shared/types/terminology";

import type { AnnotationInput } from "./observations-api";

// ─── Queries ─────────────────────────────────────────────────────────

const GetPatientConditionsQuery = graphql(`
  query GetPatientConditions($patientId: ID!, $locale: String) {
    getPatient(id: $patientId) {
      conditions {
        id
        clinicalStatus
        verificationStatus
        code {
          text
          coding {
            system
            code
            version
            display(locale: $locale)
          }
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
export type ConditionItem = NonNullable<
  NonNullable<ResultOf<typeof GetPatientConditionsQuery>["getPatient"]>["conditions"]
>[number];

/** Form data for the pathologies (conditions) onboarding step. */
export interface PathologiesFormData {
  pathologies: TerminologyTag[];
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Fetch all condition records for a patient.
 */
export async function fetchConditions(
  patientId: string,
  organizationId: string,
): Promise<ConditionItem[]> {
  if (!patientId || !organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: GetPatientConditionsQuery,
    variables: { patientId, locale: getLocale() },
    organizationId,
  });

  return result.getPatient?.conditions ?? [];
}

/**
 * Create one Condition per tag (active, confirmed).
 */
export async function createConditionsFromTags(
  tags: TerminologyTag[],
  patientId: string,
  organizationId: string,
): Promise<void> {
  const makeRecord = (tag: TerminologyTag) =>
    (async () => {
      const result = await requestGraphql({
        document: CreateConditionMutation,
        variables: {
          input: {
            clinicalStatus: "ACTIVE",
            verificationStatus: "CONFIRMED",
            subjectId: patientId,
            code: tag.coding
              ? {
                  text: tag.label,
                  coding: [
                    {
                      system: tag.coding.system,
                      code: tag.coding.code,
                      version: tag.coding.version ?? undefined,
                    },
                  ],
                }
              : { text: tag.label },
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
