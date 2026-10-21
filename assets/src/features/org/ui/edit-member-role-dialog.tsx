import { useEffect, useState } from "react";
import { toast } from "sonner";

import { updateOrganizationUserRole } from "@/features/org/api/org-api";
import { ORGANIZATION_MEMBER_ROLE_OPTIONS } from "@/features/org/constants/organization-member-role-options";
import * as m from "@/paraglide/messages";
import type { OrganizationUserRole } from "@/shared/types/schema-enums";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

export interface EditMemberRoleTarget {
  organizationUserId: string;
  initialRole: OrganizationUserRole;
}

interface EditMemberRoleDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId: string;
  readonly target: EditMemberRoleTarget | null;
  readonly onSaved: () => Promise<void>;
}

export function EditMemberRoleDialog({
  open,
  onOpenChange,
  organizationId,
  target,
  onSaved,
}: Readonly<EditMemberRoleDialogProps>) {
  const [role, setRole] = useState<OrganizationUserRole>("MEMBER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && target) {
      setRole(target.initialRole);
      setError(null);
    }
  }, [target, open]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setError(null);
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!target) {
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateOrganizationUserRole({
        organizationId,
        organizationUserId: target.organizationUserId,
        role,
      });
      toast.success(m.settings_member_role_updated());
      handleOpenChange(false);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : m.settings_member_action_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="edit-member-role-dialog">
        <DialogHeader>
          <DialogTitle>{m.settings_edit_role_dialog_title()}</DialogTitle>
          <DialogDescription>{m.settings_edit_role_dialog_desc()}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>{m.settings_invite_role_label()}</FieldLabel>
            <Select
              value={role}
              onValueChange={(value) => setRole((value ?? "MEMBER") as OrganizationUserRole)}
              items={ORGANIZATION_MEMBER_ROLE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label(),
              }))}
            >
              <SelectTrigger className="w-full" data-testid="edit-member-role-trigger">
                <SelectValue placeholder={m.settings_invite_role_placeholder()} />
              </SelectTrigger>
              <SelectPositioner>
                <SelectContent>
                  {ORGANIZATION_MEMBER_ROLE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      data-testid={`edit-member-role-option-${option.value.toLowerCase()}`}
                    >
                      {option.label()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPositioner>
            </Select>
          </Field>
        </FieldGroup>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            {m.common_cancel()}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            loading={saving}
            disabled={!target}
            data-testid="edit-member-role-save-button"
          >
            {saving ? m.common_saving() : m.common_save()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
