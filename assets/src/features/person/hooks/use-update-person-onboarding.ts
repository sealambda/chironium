import { useMutation } from "@tanstack/react-query";
import { updatePersonOnboarding } from "../api/person-api";
import type { PersonOnboardingData } from "../model/person-onboarding";

interface UpdatePersonOnboardingInput {
  personId: string;
  data: PersonOnboardingData;
}

/**
 * Mutation hook for updating person onboarding data.
 */
export function useUpdatePersonOnboarding() {
  return useMutation({
    mutationFn: (input: UpdatePersonOnboardingInput) => updatePersonOnboarding(input),
  });
}
