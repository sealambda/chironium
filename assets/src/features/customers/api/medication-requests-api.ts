import { codeInputFromTerminologyTag } from "@/features/customers/utils/terminology-code-mutation";
import { graphql, type VariablesOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import type { TerminologyTag } from "@/shared/types/terminology";

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

// ─── Types ───────────────────────────────────────────────────────────

/** One row in the patient's prescriptions list (FHIR MedicationRequest). */
export type { MedicationRequestItem } from "./patients-api";

type CreateMedicationRequestInput = NonNullable<
  VariablesOf<typeof CreateMedicationRequestMutation>["input"]
>;

type UpdateMedicationRequestInput = NonNullable<
  VariablesOf<typeof UpdateMedicationRequestMutation>["input"]
>;

type DosageInput = NonNullable<
  NonNullable<UpdateMedicationRequestInput["dosageInstruction"]>[number]
>;
type DispenseRequestInput = NonNullable<UpdateMedicationRequestInput["dispenseRequest"]>;
type SubstitutionInput = NonNullable<UpdateMedicationRequestInput["substitution"]>;

/**
 * HL7 v3 ActSubstanceAdminSubstitution — the value set FHIR binds to
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

/** Canonical English displays, stored as CodeableConcept.text for export readability. */
const SUBSTITUTION_DISPLAYS = new Map<SubstitutionCode, string>([
  ["E", "equivalent"],
  ["EC", "equivalent composition"],
  ["BC", "brand composition"],
  ["G", "generic composition"],
  ["TE", "therapeutic alternative"],
  ["TB", "therapeutic brand"],
  ["TG", "therapeutic generic"],
  ["F", "formulary"],
  ["N", "none"],
]);

/** GraphQL enum value for the MedicationRequest status. */
export type MedicationRequestStatus = NonNullable<CreateMedicationRequestInput["status"]>;

/** GraphQL enum value for the MedicationRequest course of therapy. */
export type MedicationRequestCourseOfTherapy = NonNullable<
  CreateMedicationRequestInput["courseOfTherapyType"]
>;

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
  original: MedicationRequestItem["dosageInstruction"],
  text: string,
): DosageInput[] {
  const first = original?.[0];
  // Preserve any additional instructions the single-line form doesn't represent.
  const rest = original?.slice(1) ?? [];
  if (text) {
    return [{ ...first, text }, ...rest];
  }
  if (first && (first.frequency != null || first.doseQuantity != null || first.route != null)) {
    return [{ ...first, text: null }, ...rest];
  }
  return rest;
}

/**
 * Merge the substitution choice onto the original, preserving the `reason` the
 * form doesn't expose. A code builds a coded `allowedCodeableConcept`; "" clears
 * it (keeping any reason) or drops the value when there was nothing to preserve.
 */
function mergeSubstitution(
  original: MedicationRequestItem["substitution"],
  choice: SubstitutionChoice,
): SubstitutionInput | null {
  if (choice) {
    return {
      ...original,
      allowedCodeableConcept: {
        coding: [{ system: SUBSTITUTION_SYSTEM, code: choice }],
        text: SUBSTITUTION_DISPLAYS.get(choice),
      },
    };
  }
  if (original) {
    return { ...original, allowedCodeableConcept: null };
  }
  return null;
}

/**
 * Merge the edited refill count onto the original dispense request, preserving
 * the quantity/supply/validity fields the form doesn't expose.
 */
function mergeDispense(
  original: MedicationRequestItem["dispenseRequest"],
  refills: number | null,
): DispenseRequestInput | null {
  if (refills != null) {
    return { ...original, numberOfRepeatsAllowed: refills };
  }
  if (original) {
    return { ...original, numberOfRepeatsAllowed: null };
  }
  return null;
}

/** Update the practitioner-editable fields on a prescription. */
export async function updatePrescription(
  item: MedicationRequestItem,
  data: PrescriptionFormInput,
  organizationId: string,
): Promise<void> {
  const note = data.note.trim();
  const dosageText = data.dosageText.trim();
  const parsedRefills = Number.parseInt(data.refills, 10);
  const refills =
    data.refills.trim() !== "" && Number.isFinite(parsedRefills) && parsedRefills >= 0
      ? parsedRefills
      : null;

  const result = await requestGraphql({
    document: UpdateMedicationRequestMutation,
    variables: {
      id: item.id,
      input: {
        medication: { text: data.name },
        status: data.status,
        courseOfTherapyType: data.courseOfTherapy || null,
        dosageInstruction: mergeDosage(item.dosageInstruction, dosageText),
        dispenseRequest: mergeDispense(item.dispenseRequest, refills),
        substitution: mergeSubstitution(item.substitution, data.substitution),
        // Send an explicit empty list so a cleared note overwrites the previous value.
        note: note ? [{ text: note }] : [],
      },
    },
    organizationId,
  });
  unwrapMutationResult(result.updateMedicationRequest, "Failed to update prescription.");
}
