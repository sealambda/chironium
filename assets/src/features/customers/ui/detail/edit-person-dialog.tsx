import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import type { PersonFormData } from "@/features/customers/api/patients-api";
import type { Person } from "@/features/customers/api/persons-api";
import { updatePerson } from "@/features/customers/api/persons-api";
import { PersonStep } from "@/features/customers/ui/onboarding/person-step";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { extractContactInfo } from "@/shared/utils/contact-utils";

interface EditPersonDialogProps {
  readonly person: Person;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/** Extract PersonFormData from a Person record for pre-filling the form. */
function toFormData(person: Person): PersonFormData {
  const name = person.name?.[0];
  const { email, phone, instagram } = extractContactInfo(person.telecom);

  return {
    givenName: name?.given?.[0] ?? "",
    familyName: name?.family ?? "",
    birthDate: person.birthDate ?? undefined,
    gender: person.gender ?? undefined,
    phone: phone ?? undefined,
    email: email ?? undefined,
    instagram: instagram ?? undefined,
  };
}

export function EditPersonDialog({ person, open, onOpenChange }: EditPersonDialogProps) {
  const [saving, setSaving] = useState(false);
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const handleSubmit = async (data: PersonFormData) => {
    setSaving(true);
    try {
      await updatePerson(person.id, data, selectedOrg?.id ?? "");

      await queryClient.invalidateQueries({
        queryKey: ["person", person.id],
      });

      toast.success(m.edit_person_success());
      onOpenChange(false);
    } catch {
      toast.error(m.edit_person_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.edit_person_title()}</DialogTitle>
        </DialogHeader>

        <PersonStep
          initialData={toFormData(person)}
          isSubmitting={saving}
          submitLabel={m.common_save()}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
