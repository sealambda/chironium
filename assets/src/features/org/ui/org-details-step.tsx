import { useState } from "react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { DialogFooter } from "@/shared/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

interface OrgDetailsStepProps {
  readonly initialData?: { name: string; slug: string };
  readonly onSubmit: (data: { name: string; slug: string }) => void;
  readonly onCancel: () => void;
}

/**
 * Step 1: Collect organisation name and slug.
 * Auto-generates the slug from the name input.
 */
export function OrgDetailsStep({ initialData, onSubmit, onCancel }: OrgDetailsStepProps) {
  const [orgName, setOrgName] = useState(initialData?.name ?? "");
  const [orgSlug, setOrgSlug] = useState(initialData?.slug ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!orgName.trim()) {
      newErrors.orgName = m.validation_required();
    }
    if (!orgSlug.trim()) {
      newErrors.orgSlug = m.validation_required();
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    onSubmit({ name: orgName.trim(), slug: orgSlug.trim() });
  };

  return (
    <>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.orgName)}>
          <FieldLabel>{m.org_name()}</FieldLabel>
          <Input
            value={orgName}
            onChange={(e) => {
              setOrgName(e.target.value);
              if (errors.orgName) {
                setErrors((prev) => ({ ...prev, orgName: "" }));
              }
              const slug = e.target.value
                .toLowerCase()
                .replaceAll(/[^a-z0-9]+/g, "-")
                .replaceAll(/(?:^-+)|(?:-+$)/g, "");
              setOrgSlug(slug);
            }}
            placeholder={m.org_name_placeholder()}
            aria-invalid={Boolean(errors.orgName)}
          />
          {errors.orgName ? <FieldError>{errors.orgName}</FieldError> : null}
        </Field>

        <Field data-invalid={Boolean(errors.orgSlug)}>
          <FieldLabel>{m.org_slug()}</FieldLabel>
          <Input
            value={orgSlug}
            onChange={(e) => {
              setOrgSlug(e.target.value);
              if (errors.orgSlug) {
                setErrors((prev) => ({ ...prev, orgSlug: "" }));
              }
            }}
            placeholder={m.org_slug_placeholder()}
            aria-invalid={Boolean(errors.orgSlug)}
          />
          <FieldDescription>{m.org_slug_desc()}</FieldDescription>
          {errors.orgSlug ? <FieldError>{errors.orgSlug}</FieldError> : null}
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {m.common_cancel()}
        </Button>
        <Button onClick={handleSubmit}>{m.common_next()}</Button>
      </DialogFooter>
    </>
  );
}
