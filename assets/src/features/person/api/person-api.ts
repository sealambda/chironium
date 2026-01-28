import { postGraphql } from "@/shared/api/graphql";
import { getApiBase, getAuthHeaders } from "@/shared/api/request";
import type { PersonOnboardingData } from "../model/person-onboarding";

interface UpdatePersonOnboardingInput {
  personId: string;
  data: PersonOnboardingData;
}

/**
 * Update person information via GraphQL mutation.
 *
 * @param personId - Person identifier to update.
 * @param data - Person data to update.
 * @returns Promise that resolves when update succeeds.
 * @throws Error if update fails.
 */
export async function updatePersonOnboarding({
  personId,
  data,
}: UpdatePersonOnboardingInput): Promise<void> {
  try {
    const result = await postGraphql<{
      updatePerson: {
        result: {
          id: string;
        } | null;
        errors: { message?: string }[] | null;
      };
    }>({
      apiBase: getApiBase(),
      query: `
        mutation UpdatePerson($id: ID!, $input: UpdatePersonInput!) {
          updatePerson(id: $id, input: $input) {
            result {
              id
              givenName
              stSurname
              ndSurname
              birthDate
            }
            errors {
              message
            }
          }
        }
      `,
      variables: {
        id: personId,
        input: {
          givenName: data.givenName,
          stSurname: data.stSurname,
          ndSurname: data.ndSurname,
          birthDate: data.birthDate,
        },
      },
      headers: getAuthHeaders(),
    });

    const payload = result.updatePerson;
    if (!payload?.result) {
      const errorMessage =
        payload?.errors
          ?.map((error) => error.message)
          .filter(Boolean)
          .join(" ") || "Failed to update person";
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("Error updating person:", error);
    throw error;
  }
}
