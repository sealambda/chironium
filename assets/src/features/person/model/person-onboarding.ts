import type { Person } from "@/gql/graphql";

/**
 * Required Person fields for onboarding.
 * When any of these fields are missing, the onboarding modal will be shown.
 */
export const REQUIRED_PERSON_FIELDS = [
  "givenName",
  "stSurname",
  "ndSurname",
  "birthDate",
] as const;

export type RequiredPersonField = (typeof REQUIRED_PERSON_FIELDS)[number];

/**
 * Check if a person's data is incomplete (missing required fields).
 * Returns true if onboarding is needed.
 */
export function isPersonIncomplete(person: Person | null | undefined): boolean {
  if (!person) return true;

  return REQUIRED_PERSON_FIELDS.some((field) => {
    const value = person[field];
    return value === null || value === undefined || value === "";
  });
}

/**
 * Get a list of missing required Person fields.
 * Useful for debugging or showing specific missing fields to the user.
 */
export function getMissingPersonFields(
  person: Person | null | undefined,
): RequiredPersonField[] {
  if (!person) return [...REQUIRED_PERSON_FIELDS];

  return REQUIRED_PERSON_FIELDS.filter((field) => {
    const value = person[field];
    return value === null || value === undefined || value === "";
  });
}

/**
 * Person data for the onboarding form.
 */
export interface PersonOnboardingData {
  givenName: string;
  stSurname: string;
  ndSurname: string;
  birthDate: string;
}

/**
 * Validate that all required fields are filled.
 */
export function validatePersonOnboardingData(
  data: Partial<PersonOnboardingData>,
): data is PersonOnboardingData {
  return REQUIRED_PERSON_FIELDS.every((field) => {
    const value = data[field as keyof PersonOnboardingData];
    return typeof value === "string" && value.trim().length > 0;
  });
}
