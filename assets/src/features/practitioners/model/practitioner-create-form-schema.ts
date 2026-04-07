import { z } from "zod";

import {
  personFamilyNameField,
  personGivenNameField,
} from "@/features/customers/model/onboarding-schemas";
import { emailOptionalSchema } from "@/shared/utils/email-validation";

export const practitionerCreateFormSchema = z.object({
  givenName: personGivenNameField,
  familyName: personFamilyNameField,
  birthDate: z.string(),
  email: emailOptionalSchema,
});

export type PractitionerCreateFormValues = z.infer<typeof practitionerCreateFormSchema>;

export const practitionerCreateFormEmpty: PractitionerCreateFormValues = {
  givenName: "",
  familyName: "",
  birthDate: "",
  email: "",
};
