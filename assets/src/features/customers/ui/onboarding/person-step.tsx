import { useState } from "react";

import type { PersonFormData } from "@/features/customers/api/onboarding-api";
import * as m from "@/paraglide/messages";
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

import { StepLayout } from "./step-layout";

interface PersonStepProps {
  readonly initialData?: PersonFormData;
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
export function PersonStep({ initialData, onSubmit, onCancel }: PersonStepProps) {
  const [givenName, setGivenName] = useState(initialData?.givenName ?? "");
  const [familyName, setFamilyName] = useState(initialData?.familyName ?? "");
  const [birthDate, setBirthDate] = useState(initialData?.birthDate ?? "");
  const [gender, setGender] = useState<AdministrativeGender | "">(initialData?.gender ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [instagram, setInstagram] = useState(initialData?.instagram ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!givenName.trim()) {
      newErrors.givenName = m.validation_required();
    }
    if (!familyName.trim()) {
      newErrors.familyName = m.validation_required();
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    onSubmit({
      givenName: givenName.trim(),
      familyName: familyName.trim(),
      birthDate: birthDate || undefined,
      gender: (gender as AdministrativeGender) || undefined,
      phone: phone || undefined,
      email: email.trim() || undefined,
      instagram: instagram.trim() || undefined,
    });
  };

  return (
    <StepLayout
      title={m.step_personal_title()}
      description={m.step_personal_desc()}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.givenName)}>
            <FieldLabel>{m.field_given_name()}</FieldLabel>
            <Input
              value={givenName}
              onChange={(e) => {
                setGivenName(e.target.value);
                if (errors.givenName) {
                  setErrors((prev) => ({ ...prev, givenName: "" }));
                }
              }}
              aria-invalid={Boolean(errors.givenName)}
            />
            {errors.givenName ? <FieldError>{errors.givenName}</FieldError> : null}
          </Field>

          <Field data-invalid={Boolean(errors.familyName)}>
            <FieldLabel>{m.field_family_name()}</FieldLabel>
            <Input
              value={familyName}
              onChange={(e) => {
                setFamilyName(e.target.value);
                if (errors.familyName) {
                  setErrors((prev) => ({ ...prev, familyName: "" }));
                }
              }}
              aria-invalid={Boolean(errors.familyName)}
            />
            {errors.familyName ? <FieldError>{errors.familyName}</FieldError> : null}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>{m.field_birth_date()}</FieldLabel>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </Field>

          <Field>
            <FieldLabel>{m.field_gender()}</FieldLabel>
            <Select
              value={gender}
              onValueChange={(value) => setGender(value as AdministrativeGender)}
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
        </div>

        <Field>
          <FieldLabel>{m.field_phone()}</FieldLabel>
          <PhoneInput value={phone} onChange={setPhone} />
        </Field>

        <Field>
          <FieldLabel>{m.field_email()}</FieldLabel>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>

        <Field>
          <FieldLabel>{m.field_instagram()}</FieldLabel>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <InputGroupText>@</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="username"
            />
          </InputGroup>
        </Field>
      </FieldGroup>
    </StepLayout>
  );
}
