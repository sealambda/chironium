import { graphql } from "@/gql";
import type { AdministrativeGender, ListSubscriptionPlansQuery } from "@/gql/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

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

const CreateSubscriptionMutation = graphql(`
  mutation CreateSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) {
      result {
        id
        state
        startDate
      }
      errors {
        message
      }
    }
  }
`);

const CreateObservationMutation = graphql(`
  mutation CreateObservation($input: CreateObservationInput!) {
    createObservation(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

const ListSubscriptionPlansQuery = graphql(`
  query ListSubscriptionPlans($first: Int) {
    listSubscriptionPlans(first: $first) {
      results {
        id
        name
        duration {
          value
          code
        }
        priceAmount {
          amount
          currency
        }
      }
    }
  }
`);

export interface PersonFormData {
  givenName: string;
  familyName: string;
  birthDate?: string;
  gender?: AdministrativeGender;
  phone?: string;
  email?: string;
  instagram?: string;
}

export interface CreatePatientResult {
  patientId: string;
  personId: string;
}

/**
 * Create a patient with an associated person record.
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

export interface SubscriptionFormData {
  planId: string;
  startDate?: string;
}

/**
 * Create a subscription for a person.
 */
export async function createSubscription(
  data: SubscriptionFormData,
  subscriberId: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: CreateSubscriptionMutation,
    variables: {
      input: {
        subscriberId,
        planId: data.planId,
        startDate: data.startDate || undefined,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.createSubscription, "Failed to create subscription.");
}

/**
 * Create an objective observation (code 703039001) for a patient.
 */
export async function createObjective(
  note: string,
  subjectId: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: CreateObservationMutation,
    variables: {
      input: {
        status: "FINAL",
        code: { coding: [{ system: "http://snomed.info/sct", code: "703039001" }] },
        valueString: note,
        note: [{ text: note, authorString: "System", time: new Date().toISOString() }],
        subjectId,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.createObservation, "Failed to create objective.");
}

export type SubscriptionPlan = NonNullable<
  NonNullable<ListSubscriptionPlansQuery["listSubscriptionPlans"]>["results"]
>[number];

/**
 * Fetch available subscription plans.
 */
export async function fetchSubscriptionPlans(organizationId: string): Promise<SubscriptionPlan[]> {
  const data = await requestGraphql({
    document: ListSubscriptionPlansQuery,
    variables: { first: 50 },
    organizationId,
  });

  return data.listSubscriptionPlans?.results ?? [];
}
