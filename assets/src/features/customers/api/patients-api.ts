import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import type { AdministrativeGender } from "@/shared/types/schema-enums";

// ─── Queries ─────────────────────────────────────────────────────────

const PatientByPersonQuery = graphql(`
  query PatientByPerson($filter: PatientFilterInput, $first: Int) {
    listPatients(filter: $filter, first: $first) {
      results {
        id
        personId
      }
    }
  }
`);

// ─── Mutations ───────────────────────────────────────────────────────

const CreatePatientWithPersonMutation = graphql(`
  mutation CreatePatientWithPerson($input: CreatePatientWithPersonInput) {
    createPatientWithPerson(input: $input) {
      result {
        id
        personId
      }
      errors {
        message
      }
    }
  }
`);

// ─── Types ───────────────────────────────────────────────────────────

/** Form fields for creating a new person and their linked patient record. */
export interface PersonFormData {
  givenName: string;
  familyName: string;
  birthDate?: string;
  gender?: AdministrativeGender;
  phone?: string;
  email?: string;
  instagram?: string;
}

/** IDs returned after successfully creating a patient. */
export interface CreatePatientResult {
  patientId: string;
  personId: string;
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Create a patient record alongside its linked person in a single mutation.
 * Returns the new patient and person IDs.
 */
export async function createPatientWithPerson(
  data: PersonFormData,
  organizationId: string,
): Promise<CreatePatientResult> {
  const telecom: Array<{ system: string; value: string }> = [];
  if (data.phone) {
    telecom.push({ system: "PHONE", value: data.phone });
  }
  if (data.email) {
    telecom.push({ system: "EMAIL", value: data.email });
  }
  if (data.instagram) {
    telecom.push({ system: "URL", value: data.instagram });
  }

  const result = await requestGraphql({
    document: CreatePatientWithPersonMutation,
    variables: {
      input: {
        person: {
          name: [{ given: [data.givenName], family: data.familyName }],
          birthDate: data.birthDate || undefined,
          gender: data.gender || undefined,
          telecom: telecom.length > 0 ? telecom : undefined,
        },
      },
    },
    organizationId,
  });

  const patient = unwrapMutationResult(result.createPatientWithPerson, "Failed to create patient.");

  return { patientId: patient.id, personId: patient.personId ?? "" };
}

/**
 * Fetch the patient record associated with a person.
 * Returns the patient ID, or null if no patient exists for the person.
 */
export async function fetchPatientByPerson(
  personId: string,
  organizationId: string,
): Promise<string | null> {
  if (!personId || !organizationId) {
    return null;
  }

  const result = await requestGraphql({
    document: PatientByPersonQuery,
    variables: {
      filter: { personId: { eq: personId } },
      first: 1,
    },
    organizationId,
  });

  return result.listPatients?.results?.[0]?.id ?? null;
}
