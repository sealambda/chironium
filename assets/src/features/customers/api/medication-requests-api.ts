import { graphql, type ResultOf, type VariablesOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

import type { MedicationRequestItem } from "./patients-api";

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
        courseOfTherapyType
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

type CreateMedicationRequestResult = ResultOf<typeof CreateMedicationRequestMutation>;
type UpdateMedicationRequestResult = ResultOf<typeof UpdateMedicationRequestMutation>;
type DeleteMedicationRequestResult = ResultOf<typeof DeleteMedicationRequestMutation>;

type CreateMedicationRequestVariables = VariablesOf<typeof CreateMedicationRequestMutation>;
type UpdateMedicationRequestVariables = VariablesOf<typeof UpdateMedicationRequestMutation>;

// ─── Types ───────────────────────────────────────────────────────────

/** One row in the patient's prescriptions list (FHIR MedicationRequest). */
export type { MedicationRequestItem } from "./patients-api";

type UpdateMedicationRequestInput = NonNullable<UpdateMedicationRequestVariables["input"]>;

type DosageInstructionInput = NonNullable<
  NonNullable<UpdateMedicationRequestInput["dosageInstruction"]>[number]
>;
type DispenseRequestInput = NonNullable<UpdateMedicationRequestInput["dispenseRequest"]>;
type SubstitutionInput = NonNullable<UpdateMedicationRequestInput["substitution"]>;

type PrescriptionMutationFields = Pick<
  UpdateMedicationRequestInput,
  | "medication"
  | "status"
  | "courseOfTherapyType"
  | "dosageInstruction"
  | "dispenseRequest"
  | "substitution"
  | "note"
>;

/** Fields read from an existing prescription when applying an edit. */
export type PrescriptionUpdateSource = Pick<MedicationRequestItem, "id"> &
  Partial<Pick<MedicationRequestItem, "dosageInstruction" | "dispenseRequest" | "substitution">>;

/**
 * HL7 v3 ActSubstanceAdminSubstitutionCode — stored on
 * `MedicationRequest.substitution.allowedCodeableConcept`.
 * https://terminology.hl7.org/5.1.0/ValueSet-v3-ActSubstanceAdminSubstitutionCode.html
 */
export const SUBSTITUTION_SYSTEM =
  "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution";

/** Codes in clinical-frequency-ish order; the full value set is offered. */
export const SUBSTITUTION_CODES = ["G", "N", "TE", "E", "EC", "BC", "TB", "TG", "F"] as const;

export type SubstitutionCode = (typeof SUBSTITUTION_CODES)[number];

/** The substitution control value: "" = not specified, else a value-set code. */
export type SubstitutionChoice = "" | SubstitutionCode;

/** GraphQL enum value for the MedicationRequest status. */
export type MedicationRequestStatus = NonNullable<MedicationRequestItem["status"]>;

/** GraphQL enum value for the MedicationRequest course of therapy. */
export type MedicationRequestCourseOfTherapy = NonNullable<
  MedicationRequestItem["courseOfTherapyType"]
>;

/**
 * Form values for the prescription detail dialog.
 *
 * `courseOfTherapy` uses "" for "unset"; `refills` is a numeric string so the
 * input can be cleared. The dialog edits a single free-text dosage instruction
 * — the richer structured Dosage fields (route, dose, timing) are modeled and
 * exposed in the API but not yet surfaced in this form.
 */
export interface PrescriptionFormInput {
  name: string;
  status: MedicationRequestStatus;
  courseOfTherapy: MedicationRequestCourseOfTherapy | "";
  dosageText: string;
  refills: string;
  substitution: SubstitutionChoice;
  note: string;
}

/**
 * Merge the edited free-text dosage onto the original instruction.
 *
 * `dosageInstruction` is an unkeyed embedded array, so any value we send fully
 * replaces it. We therefore preserve the structured layer (timing, dose, route)
 * the form doesn't expose, swapping in only the edited text. Clearing the text
 * drops the instruction unless structured data remains.
 */
function mergeDosage(
  original: MedicationRequestItem["dosageInstruction"] | undefined,
  text: string,
): DosageInstructionInput[] {
  const first = original?.[0];
  const rest = original?.slice(1) ?? [];
  if (text) {
    const head = first ? { ...first, text } : { text };
    return [head, ...rest] satisfies DosageInstructionInput[];
  }
  if (first && (first.frequency != null || first.doseQuantity != null || first.route != null)) {
    return [{ ...first, text: null }, ...rest] satisfies DosageInstructionInput[];
  }
  return rest satisfies DosageInstructionInput[];
}

function mergeSubstitution(
  original: MedicationRequestItem["substitution"] | undefined,
  choice: SubstitutionChoice,
): SubstitutionInput | null {
  if (choice) {
    return {
      ...original,
      allowedCodeableConcept: {
        coding: [{ system: SUBSTITUTION_SYSTEM, code: choice }],
      },
    } satisfies SubstitutionInput;
  }
  if (original) {
    return { ...original, allowedCodeableConcept: null } satisfies SubstitutionInput;
  }
  return null;
}

function mergeDispense(
  original: MedicationRequestItem["dispenseRequest"] | undefined,
  refills: number | null,
): DispenseRequestInput | null {
  if (refills != null) {
    const next = original
      ? { ...original, numberOfRepeatsAllowed: refills }
      : { numberOfRepeatsAllowed: refills };
    return next satisfies DispenseRequestInput;
  }
  if (original) {
    return { ...original, numberOfRepeatsAllowed: null } satisfies DispenseRequestInput;
  }
  return null;
}

function parseRefills(refills: string): number | null {
  const parsed = Number.parseInt(refills, 10);
  return refills.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function prescriptionFormToMutationInput(
  data: PrescriptionFormInput,
  existing?: Pick<
    PrescriptionUpdateSource,
    "dosageInstruction" | "dispenseRequest" | "substitution"
  >,
): PrescriptionMutationFields {
  const note = data.note.trim();
  const dosageText = data.dosageText.trim();

  return {
    medication: { text: data.name.trim() },
    status: data.status,
    courseOfTherapyType: data.courseOfTherapy || null,
    dosageInstruction: mergeDosage(existing?.dosageInstruction, dosageText),
    dispenseRequest: mergeDispense(existing?.dispenseRequest, parseRefills(data.refills)),
    substitution: mergeSubstitution(existing?.substitution, data.substitution),
    note: note ? [{ text: note }] : [],
  } satisfies PrescriptionMutationFields;
}

// ─── Functions ───────────────────────────────────────────────────────

/** Create a single in-app prescription or recommendation. */
export async function createPrescription(
  data: PrescriptionFormInput,
  patientId: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql<CreateMedicationRequestResult>({
    document: CreateMedicationRequestMutation,
    variables: {
      input: {
        ...prescriptionFormToMutationInput(data),
        intent: "ORDER",
        subjectId: patientId,
      } satisfies CreateMedicationRequestVariables["input"],
    },
    organizationId,
  });
  unwrapMutationResult(result.createMedicationRequest, "Failed to create prescription.");
}

/** Permanently removes a prescription. */
export async function deleteMedicationRequest(id: string, organizationId: string): Promise<void> {
  const result = await requestGraphql<DeleteMedicationRequestResult>({
    document: DeleteMedicationRequestMutation,
    variables: { id },
    organizationId,
  });
  unwrapMutationResult(result.deleteMedicationRequest, "Failed to delete prescription.");
}

/** Update the practitioner-editable fields on a prescription. */
export async function updatePrescription(
  item: PrescriptionUpdateSource,
  data: PrescriptionFormInput,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql<UpdateMedicationRequestResult>({
    document: UpdateMedicationRequestMutation,
    variables: {
      id: item.id,
      input: prescriptionFormToMutationInput(
        data,
        item,
      ) satisfies UpdateMedicationRequestVariables["input"],
    },
    organizationId,
  });
  unwrapMutationResult(result.updateMedicationRequest, "Failed to update prescription.");
}
