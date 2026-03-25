import { useForm } from "@tanstack/react-form";

import type { PersonFormData } from "@/features/customers/api/patients-api";
import {
  CONSECUTIVE_SPECIALS,
  NAME_PATTERN,
  personSchema,
} from "@/features/customers/model/onboarding-schemas";
import * as m from "@/paraglide/messages";
import type { AdministrativeGender } from "@/shared/types/schema-enums";
import { DatePickerString } from "@/shared/ui/date-picker";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/shared/ui/input-group";
import { PhoneInput } from "@/shared/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { emailOptionalSchema } from "@/shared/utils/email-validation";

import { StepLayout } from "./step-layout";

interface PersonStepProps {
  readonly initialData?: PersonFormData;
  readonly isSubmitting?: boolean;
  readonly submitLabel?: string;
  readonly onSubmit: (data: PersonFormData) => void;
  readonly onCancel: () => void;
}

const GENDER_OPTIONS: { value: AdministrativeGender; label: () => string }[] = [
  { value: "MALE", label: () => m.gender_male() },
  { value: "FEMALE", label: () => m.gender_female() },
  { value: "OTHER", label: () => m.gender_other() },
  { value: "UNKNOWN", label: () => m.gender_unknown() },
];

/**
 * Step 1: Collect personal information to create a patient with a person record.
 */
export function PersonStep({
  initialData,
  isSubmitting,
  submitLabel,
  onSubmit,
  onCancel,
}: PersonStepProps) {
  const form = useForm({
    defaultValues: {
      givenName: initialData?.givenName ?? "",
      familyName: initialData?.familyName ?? "",
      birthDate: initialData?.birthDate ?? "",
      gender: initialData?.gender ?? "",
      phone: initialData?.phone ?? "",
      email: initialData?.email ?? "",
      instagram: initialData?.instagram ?? "",
    },
    validators: { onSubmit: personSchema },
    onSubmit: ({ value }) => {
      onSubmit({
        givenName: value.givenName.trim(),
        familyName: value.familyName.trim(),
        birthDate: value.birthDate || undefined,
        gender: (value.gender as AdministrativeGender) || undefined,
        phone: value.phone || undefined,
        email: value.email.trim() || undefined,
        instagram: value.instagram.trim() || undefined,
      });
    },
  });

  return (
    <StepLayout
      title={m.step_personal_title()}
      description={m.step_personal_desc()}
      isSubmitting={isSubmitting}
      submitLabel={submitLabel}
      onSubmit={() => form.handleSubmit()}
      onCancel={onCancel}
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <form.Field
            name="givenName"
            validators={{
              onBlur: ({ value }) => {
                if (!value || value.trim().length < 2) {
                  return m.validation_name_min();
                }
                if (!NAME_PATTERN.test(value)) {
                  return m.validation_name_format();
                }
                if (CONSECUTIVE_SPECIALS.test(value)) {
                  return m.validation_name_consecutive();
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel required>{m.field_given_name()}</FieldLabel>
                <Input
                  maxLength={50}
                  value={field.state.value}
                  onChange={(e) => {
                    let filtered = e.target.value.replaceAll(/[^\p{L}\s'.-]/gu, "");
                    filtered = filtered.replaceAll(/([\s'.-])([\s'.-]+)/gu, "$1");
                    filtered = filtered.replace(/^[\s'.-]+/, "");
                    filtered = filtered.slice(0, 50);
                    field.handleChange(filtered);
                  }}
                  onBlur={() => {
                    const trimmed = field.state.value.replace(/[\s'.-]+$/, "").trim();
                    if (trimmed !== field.state.value) {
                      field.handleChange(trimmed);
                    }
                    field.handleBlur();
                  }}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                {field.state.meta.errors.length > 0 ? (
                  <FieldError
                    errors={field.state.meta.errors.map((e) =>
                      typeof e === "string" ? { message: e } : e,
                    )}
                  />
                ) : null}
              </Field>
            )}
          </form.Field>

          <form.Field
            name="familyName"
            validators={{
              onBlur: ({ value }) => {
                if (!value || value.trim().length < 2) {
                  return m.validation_name_min();
                }
                if (!NAME_PATTERN.test(value)) {
                  return m.validation_name_format();
                }
                if (CONSECUTIVE_SPECIALS.test(value)) {
                  return m.validation_name_consecutive();
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel required>{m.field_family_name()}</FieldLabel>
                <Input
                  maxLength={50}
                  value={field.state.value}
                  onChange={(e) => {
                    let filtered = e.target.value.replaceAll(/[^\p{L}\s'.-]/gu, "");
                    filtered = filtered.replaceAll(/([\s'.-])([\s'.-]+)/gu, "$1");
                    filtered = filtered.replace(/^[\s'.-]+/, "");
                    filtered = filtered.slice(0, 50);
                    field.handleChange(filtered);
                  }}
                  onBlur={() => {
                    const trimmed = field.state.value.replace(/[\s'.-]+$/, "").trim();
                    if (trimmed !== field.state.value) {
                      field.handleChange(trimmed);
                    }
                    field.handleBlur();
                  }}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                {field.state.meta.errors.length > 0 ? (
                  <FieldError
                    errors={field.state.meta.errors.map((e) =>
                      typeof e === "string" ? { message: e } : e,
                    )}
                  />
                ) : null}
              </Field>
            )}
          </form.Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <form.Field name="birthDate">
            {(field) => (
              <Field>
                <FieldLabel>{m.field_birth_date()}</FieldLabel>
                <DatePickerString
                  value={field.state.value}
                  onChange={(v) => field.handleChange(v)}
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="gender">
            {(field) => (
              <Field>
                <FieldLabel>{m.field_gender()}</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as AdministrativeGender)}
                  items={GENDER_OPTIONS.map(({ value, label }) => ({ value, label: label() }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={m.gender_placeholder()} />
                  </SelectTrigger>
                  <SelectPositioner>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectPositioner>
                </Select>
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field name="phone">
          {(field) => (
            <Field>
              <FieldLabel>{m.field_phone()}</FieldLabel>
              <PhoneInput value={field.state.value} onChange={field.handleChange} />
            </Field>
          )}
        </form.Field>

        <form.Field
          name="email"
          validators={{
            onBlur: ({ value }) => {
              const parsed = emailOptionalSchema.safeParse(value ?? "");
              if (!parsed.success) {
                return m.validation_email_format();
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel>{m.field_email()}</FieldLabel>
              <Input
                type="email"
                value={field.state.value}
                onChange={(e) => {
                  const filtered = e.target.value.replaceAll(/[^a-zA-Z0-9.@_+-]/g, "");
                  field.handleChange(filtered);
                }}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              {field.state.meta.errors.length > 0 ? (
                <FieldError
                  errors={field.state.meta.errors.map((e) =>
                    typeof e === "string" ? { message: e } : e,
                  )}
                />
              ) : null}
            </Field>
          )}
        </form.Field>

        <form.Field name="instagram">
          {(field) => (
            <Field>
              <FieldLabel>{m.field_instagram()}</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <InputGroupText>@</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  value={field.state.value}
                  onChange={(e) => {
                    const sanitized = e.target.value
                      .toLowerCase()
                      .replaceAll(/[^a-z0-9._]/g, "")
                      .slice(0, 30);
                    field.handleChange(sanitized);
                  }}
                  onBlur={field.handleBlur}
                  placeholder="username"
                />
              </InputGroup>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </StepLayout>
  );
}
