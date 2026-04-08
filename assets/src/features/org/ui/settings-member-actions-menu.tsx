import { MoreHorizontal } from "lucide-react";

import type { EditMemberRoleTarget } from "@/features/org/ui/edit-member-role-dialog";
import type { MakePractitionerTarget } from "@/features/org/ui/make-member-practitioner-dialog";
import type { SettingsMemberTableRow } from "@/features/org/utils/settings-member-table-model";
import { memberRowHasActions } from "@/features/org/utils/settings-member-table-model";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

function makePractitionerTargetFromRow(row: SettingsMemberTableRow): MakePractitionerTarget {
  if (row.source.kind === "invitation") {
    return {
      type: "invitation",
      invitationId: row.source.invitationId,
      namePreset: row.practitionerNamePreset,
    };
  }
  return {
    type: "user",
    userId: row.source.userId,
    namePreset: row.practitionerNamePreset,
  };
}

export function SettingsMemberActionsMenu({
  row,
  onEditRole,
  onMakePractitioner,
}: Readonly<{
  row: SettingsMemberTableRow;
  onEditRole: (target: EditMemberRoleTarget) => void;
  onMakePractitioner: (target: MakePractitionerTarget) => void;
}>) {
  if (!memberRowHasActions(row)) {
    return null;
  }

  const editTarget: EditMemberRoleTarget | null =
    row.source.kind === "membership"
      ? {
          organizationUserId: row.source.organizationUserId,
          initialRole: row.orgRole ?? "MEMBER",
        }
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={m.settings_members_actions_aria()}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        {editTarget ? (
          <DropdownMenuItem onClick={() => onEditRole(editTarget)}>
            {m.settings_member_edit_role()}
          </DropdownMenuItem>
        ) : null}
        {row.hasPractitionerGrant ? null : (
          <DropdownMenuItem onClick={() => onMakePractitioner(makePractitionerTargetFromRow(row))}>
            {m.settings_member_make_practitioner()}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
