import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { codeInputFromTerminologyTag } from "@/features/customers/utils/terminology-code-mutation";
import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import type { TerminologyTag } from "@/shared/types/terminology";

import type { AnnotationInput } from "./observations-api";

// ─── Mutations ───────────────────────────────────────────────────────

const CreateAllergyIntoleranceMutation = graphql(`
  mutation CreateAllergyIntolerance($input: CreateAllergyIntoleranceInput!) {
    createAllergyIntolerance(input: $input) {
      result {
        id
        type
      }
      errors {
        message
      }
    }
  }
`);

const UpdateAllergyIntoleranceMutation = graphql(`
  mutation UpdateAllergyIntolerance(
    $id: ID!
    $input: UpdateAllergyIntoleranceInput
  ) {
    updateAllergyIntolerance(id: $id, input: $input) {
      result {
        id
        type
        clinicalStatus
        verificationStatus
        code {
          text
          coding {
            system
            code
            version
          }
        }
        onsetDateTime
        onsetAge {
          value
          code
        }
        onsetPeriod {
          start
          end
        }
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

const DeleteAllergyIntoleranceMutation = graphql(`
  mutation DeleteAllergyIntolerance($id: ID!) {
    deleteAllergyIntolerance(id: $id) {
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

/** A single allergy or intolerance record returned by the patient query. */
export type { AllergyIntoleranceItem } from "./patients-api";

/** Form data for the allergies and intolerances onboarding fields. */
export interface AllergiesFormData {
  allergies: TerminologyTag[];
  intolerances: TerminologyTag[];
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Create one record per tag for allergies and intolerances.
 */
export async function createAllergiesAndIntolerances(
  data: AllergiesFormData,
  patientId: string,
  organizationId: string,
): Promise<void> {
  const makeRecord = (type: "ALLERGY" | "INTOLERANCE", tag: TerminologyTag) =>
    (async () => {
      const result = await requestGraphql({
        document: CreateAllergyIntoleranceMutation,
        variables: {
          input: {
            type,
            clinicalStatus: "ACTIVE",
            verificationStatus: "CONFIRMED",
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
            patientId,
          },
        },
        organizationId,
      });
      unwrapMutationResult(
        result.createAllergyIntolerance,
        `Failed to create ${type.toLowerCase()} record.`,
      );
    })();

  await Promise.all([
    ...data.allergies.map((tag) => makeRecord("ALLERGY", tag)),
    ...data.intolerances.map((tag) => makeRecord("INTOLERANCE", tag)),
  ]);
}

/**
 * Replace the annotation notes array on an allergy or intolerance record.
 * Sends the full notes array — partial updates are not supported by the API.
 */
export async function updateAllergyIntoleranceNotes(
  id: string,
  notes: AnnotationInput[],
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateAllergyIntoleranceMutation,
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
  unwrapMutationResult(
    result.updateAllergyIntolerance,
    "Failed to update allergy/intolerance notes.",
  );
}

/**
 * Update the display text of an uncoded allergy or intolerance record.
 * Only valid for records without a coded concept (code.coding is empty).
 */
export async function updateAllergyIntoleranceCode(
  id: string,
  text: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateAllergyIntoleranceMutation,
    variables: { id, input: { code: { text } } },
    organizationId,
  });
  unwrapMutationResult(result.updateAllergyIntolerance, "Failed to update record.");
}

export async function updateAllergyIntoleranceCodeFromTag(
  id: string,
  tag: TerminologyTag,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateAllergyIntoleranceMutation,
    variables: { id, input: { code: codeInputFromTerminologyTag(tag) } },
    organizationId,
  });
  unwrapMutationResult(result.updateAllergyIntolerance, "Failed to update record.");
}

/**
 * Permanently removes an allergy or intolerance record.
 */
export async function deleteAllergyIntolerance(id: string, organizationId: string): Promise<void> {
  const result = await requestGraphql({
    document: DeleteAllergyIntoleranceMutation,
    variables: { id },
    organizationId,
  });
  unwrapMutationResult(result.deleteAllergyIntolerance, "Failed to delete allergy/intolerance.");
}

// ─── Full-record create/update for the detail dialog ─────────────────

export interface AllergyIntoleranceFormInput {
  type: "ALLERGY" | "INTOLERANCE";
  name: string;
  clinicalStatus: "ACTIVE" | "INACTIVE" | "RESOLVED";
  verificationStatus: "CONFIRMED" | "PRESUMED" | "UNCONFIRMED";
  onsetMode: "none" | "date" | "age" | "period";
  onsetDateTime?: string;
  onsetAge?: { value: string; unit: "A" | "MO" | "WK" | "D" };
  onsetPeriod?: { start?: string; end?: string };
}

function buildAllergyInput(data: AllergyIntoleranceFormInput) {
  let onset: Record<string, unknown> = {};
  if (data.onsetMode === "date") {
    onset = { onsetDateTime: data.onsetDateTime || undefined };
  } else if (data.onsetMode === "age" && data.onsetAge?.value) {
    onset = {
      onsetAge: {
        value: data.onsetAge.value,
        code: data.onsetAge.unit,
        system: "http://unitsofmeasure.org",
      },
    };
  } else if (data.onsetMode === "period") {
    onset = {
      onsetPeriod: {
        start: data.onsetPeriod?.start || undefined,
        end: data.onsetPeriod?.end || undefined,
      },
    };
  }

  return {
    type: data.type,
    clinicalStatus: data.clinicalStatus,
    verificationStatus: data.verificationStatus,
    code: { text: data.name },
    ...onset,
  };
}

/**
 * Create a single allergy or intolerance record with full clinical metadata.
 */
export async function createAllergyIntolerance(
  data: AllergyIntoleranceFormInput,
  patientId: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: CreateAllergyIntoleranceMutation,
    variables: { input: { ...buildAllergyInput(data), patientId } },
    organizationId,
  });
  unwrapMutationResult(
    result.createAllergyIntolerance,
    "Failed to create allergy/intolerance record.",
  );
}

/**
 * Update all clinical fields on an existing allergy or intolerance record.
 */
export async function updateAllergyIntolerance(
  id: string,
  data: AllergyIntoleranceFormInput,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateAllergyIntoleranceMutation,
    variables: { id, input: buildAllergyInput(data) },
    organizationId,
  });
  unwrapMutationResult(result.updateAllergyIntolerance, "Failed to update record.");
}

/**
 * Soft-removes a record by changing its verification status to indicate the
 * record was entered in error or has been clinically refuted.
 */
export async function removeAllergyIntolerance(
  id: string,
  reason: "ENTERED_IN_ERROR" | "REFUTED",
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateAllergyIntoleranceMutation,
    variables: { id, input: { verificationStatus: reason } },
    organizationId,
  });
  unwrapMutationResult(result.updateAllergyIntolerance, "Failed to remove record.");
}
