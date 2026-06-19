import { codeInputFromTerminologyTag } from "@/features/customers/utils/terminology-code-mutation";
import { graphql, type VariablesOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import type { TerminologyTag } from "@/shared/types/terminology";

// ─── Mutations ───────────────────────────────────────────────────────

const CreateMedicationRequestMutation = graphql(`
  mutation CreateMedicationRequest($input: CreateMedicationRequestInput!) {
    createMedicationRequest(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const UpdateMedicationRequestMutation = graphql(`
  mutation UpdateMedicationRequest($id: ID!, $input: UpdateMedicationRequestInput) {
    updateMedicationRequest(id: $id, input: $input) {
      result {
        id
        status
        note {
          text
        }
      }
      errors {
        message
      }
    }
  }
`);

const DeleteMedicationRequestMutation = graphql(`
  mutation DeleteMedicationRequest($id: ID!) {
    deleteMedicationRequest(id: $id) {
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

/** One row in the patient's prescriptions list (FHIR MedicationRequest). */
export type { MedicationRequestItem } from "./patients-api";

type CreateMedicationRequestInput = NonNullable<
  VariablesOf<typeof CreateMedicationRequestMutation>["input"]
>;

/** GraphQL enum value for the MedicationRequest status. */
export type MedicationRequestStatus = NonNullable<CreateMedicationRequestInput["status"]>;

export type PrescriptionCreateOptions = Partial<Pick<CreateMedicationRequestInput, "status">>;

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Create one MedicationRequest (prescription) per tag. The prescribing
 * practitioner is assigned server-side from the acting actor.
 */
export async function createPrescriptionsFromTags(
  tags: TerminologyTag[],
  patientId: string,
  organizationId: string,
  options: PrescriptionCreateOptions = {},
): Promise<void> {
  const makeRecord = (tag: TerminologyTag) =>
    requestGraphql({
      document: CreateMedicationRequestMutation,
      variables: {
        input: {
          status: options.status ?? "ACTIVE",
          intent: "ORDER",
          subjectId: patientId,
          medication: codeInputFromTerminologyTag(tag),
        },
      },
      organizationId,
    }).then((result) =>
      unwrapMutationResult(result.createMedicationRequest, "Failed to create prescription."),
    );

  await Promise.all(tags.map(makeRecord));
}

/** Permanently removes a prescription. */
export async function deleteMedicationRequest(id: string, organizationId: string): Promise<void> {
  const result = await requestGraphql({
    document: DeleteMedicationRequestMutation,
    variables: { id },
    organizationId,
  });
  unwrapMutationResult(result.deleteMedicationRequest, "Failed to delete prescription.");
}

// ─── Detail update ────────────────────────────────────────────────────

/** Form values for the prescription detail dialog. */
export interface PrescriptionFormInput {
  name: string;
  status: MedicationRequestStatus;
  note: string;
}

/** Update name, status, and note on a prescription. */
export async function updatePrescription(
  id: string,
  data: PrescriptionFormInput,
  organizationId: string,
): Promise<void> {
  const note = data.note.trim();

  const result = await requestGraphql({
    document: UpdateMedicationRequestMutation,
    variables: {
      id,
      input: {
        medication: { text: data.name },
        status: data.status,
        // Send an explicit empty list so a cleared note overwrites the previous value.
        note: note ? [{ text: note }] : [],
      },
    },
    organizationId,
  });
  unwrapMutationResult(result.updateMedicationRequest, "Failed to update prescription.");
}
