import { graphql, type ResultOf } from "@/graphql";
import { getLocale } from "@/paraglide/runtime";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import type { AdministrativeGender } from "@/shared/types/schema-enums";

// ─── Queries ─────────────────────────────────────────────────────────

const PatientWorkspaceProfileFragment = graphql(`
  fragment PatientWorkspaceProfile on Patient @_unmask {
    id
    personId
    person {
      id
      name {
        given
        family
      }
      telecom {
        system
        value
        use
      }
      gender
      birthDate
    }
    allergyIntolerances(limit: 250) {
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
          display(locale: $locale)
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
      recordedDate
      lastOccurrence
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
        changedByPatient {
          id
        }
      }
    }
    conditions(limit: 250) {
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
      onsetDateTime
      onsetAge {
        value
        code
      }
      onsetPeriod {
        start
        end
      }
      abatementDateTime
      abatementPeriod {
        start
        end
      }
      recordedDate
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
        changedByPatient {
          id
        }
      }
    }
    medicationStatements(limit: 250) {
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
        changedByPatient {
          id
        }
      }
    }
  }
`);

const PatientWorkspaceCareFragment = graphql(`
  fragment PatientWorkspaceCare on Patient @_unmask {
    medicationRequests(limit: 250) {
      id
      status
      intent
      courseOfTherapyType
      medication {
        text
        coding {
          system
          code
          version
          display(locale: $locale)
        }
      }
      dosageInstruction {
        text
        patientInstruction
        asNeeded
        frequency
        period
        periodUnit
        route {
          text
        }
        doseQuantity {
          value
          unit
        }
      }
      dispenseRequest {
        numberOfRepeatsAllowed
        quantity {
          value
          unit
        }
        expectedSupplyDuration {
          value
          code
        }
        validityPeriod {
          start
          end
        }
      }
      substitution {
        allowedCodeableConcept {
          coding {
            system
            code
          }
        }
        reason {
          text
        }
      }
      authoredOn
      requester {
        id
        name {
          text
          given
          family
        }
      }
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
        changedByPatient {
          id
        }
      }
    }
    goals(sort: [{ field: PRIORITY, order: ASC }], limit: 250) {
      id
      lifecycleStatus
      achievementStatus
      priority
      description {
        text
      }
      startDate
      dueDate
      category
      note {
        text
        time
        authorString
        authorReference
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
        changedByPatient {
          id
        }
      }
    }
    nutritionPlans(limit: 250) {
      id
      targetKcal
      proteinG
      carbsG
      fatG
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
        changedByPatient {
          id
        }
      }
    }
    observations(sort: [{ field: EFFECTIVE_DATE_TIME, order: DESC }], limit: 250) {
      id
      status
      observationType
      code {
        text
        coding {
          system
          code
          version
          display(locale: $locale)
        }
      }
      effectiveDateTime
      selfReported
      valueString
      valueDateTime
      valueQuantity {
        value
        unit
        system
        code
      }
      valueCodeableConcept {
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
        changedByPatient {
          id
        }
      }
    }
  }
`);

const PatientWorkspaceByPersonQuery = graphql(
  `
    query PatientWorkspaceByPerson($personId: ID!, $locale: String) {
      listPatients(filter: { personId: { eq: $personId } }, first: 1) {
        results {
          ...PatientWorkspaceProfile
          ...PatientWorkspaceCare
        }
      }
    }
  `,
  [PatientWorkspaceProfileFragment, PatientWorkspaceCareFragment],
);

// ─── Mutations ───────────────────────────────────────────────────────

const CreatePatientMutation = graphql(`
  mutation CreatePatient($input: CreatePatientInput!) {
    createPatient(input: $input) {
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

/** Full patient record returned by the detail query. */
export type PatientDetail = NonNullable<
  NonNullable<ResultOf<typeof PatientWorkspaceByPersonQuery>["listPatients"]>["results"]
>[number];

export type AllergyIntoleranceItem = NonNullable<PatientDetail["allergyIntolerances"]>[number];
export type ConditionItem = NonNullable<PatientDetail["conditions"]>[number];
export type GoalRecord = NonNullable<PatientDetail["goals"]>[number];
export type MedicationItem = NonNullable<PatientDetail["medicationStatements"]>[number];
export type MedicationRequestItem = NonNullable<PatientDetail["medicationRequests"]>[number];
export type NutritionPlanRecord = NonNullable<PatientDetail["nutritionPlans"]>[number];
export type PatientObservation = NonNullable<PatientDetail["observations"]>[number];

type PatientWorkspaceByPersonResult = ResultOf<typeof PatientWorkspaceByPersonQuery>;

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Create a patient record alongside its linked person in a single mutation.
 * Returns the new patient and person IDs.
 */
export async function createPatientWithPerson(
  data: PersonFormData,
  organizationId: string,
): Promise<CreatePatientResult> {
  const fullName = `${data.givenName} ${data.familyName}`.trim();
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
          name: [
            {
              given: [data.givenName],
              family: data.familyName,
              text: fullName,
            },
          ],
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
 * Fetch the full patient detail for a person, including demographics, goals,
 * nutrition plans, and allergy intolerances. Returns null if no patient exists.
 */
export async function fetchPatientDetail(
  personId: string,
  organizationId: string,
): Promise<PatientDetail | null> {
  if (!personId || !organizationId) {
    return null;
  }

  const result = await requestGraphql<PatientWorkspaceByPersonResult>({
    document: PatientWorkspaceByPersonQuery,
    variables: { personId, locale: getLocale() },
    organizationId,
  });

  return result.listPatients?.results?.[0] ?? null;
}

/**
 * Create a patient record linked to an existing person.
 * Returns the new patient ID.
 */
export async function createPatientForPerson(
  personId: string,
  organizationId: string,
): Promise<string> {
  const result = await requestGraphql({
    document: CreatePatientMutation,
    variables: { input: { personId } },
    organizationId,
  });

  const patient = unwrapMutationResult(result.createPatient, "Failed to create patient record.");
  return patient.id;
}
