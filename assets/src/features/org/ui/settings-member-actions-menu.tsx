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
  onRevokeInvitation,
  onCopyInvitationLink,
  onRenewInvitation,
}: Readonly<{
  row: SettingsMemberTableRow;
  onEditRole: (target: EditMemberRoleTarget) => void;
  onMakePractitioner: (target: MakePractitionerTarget) => void;
  onRevokeInvitation: (invitationId: string) => void;
  onCopyInvitationLink: (row: SettingsMemberTableRow) => void;
  onRenewInvitation: (row: SettingsMemberTableRow) => void;
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
            data-testid={`member-actions-${row.key}`}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-auto">
        {editTarget ? (
          <DropdownMenuItem
            className="cursor-pointer whitespace-nowrap"
            onClick={() => onEditRole(editTarget)}
            data-testid={`member-edit-role-${row.key}`}
          >
            {m.settings_member_edit_role()}
          </DropdownMenuItem>
        ) : null}
        {row.hasPractitionerGrant ? null : (
          <DropdownMenuItem
            className="cursor-pointer whitespace-nowrap"
            onClick={() => onMakePractitioner(makePractitionerTargetFromRow(row))}
            data-testid={`member-make-practitioner-${row.key}`}
          >
            {m.settings_member_make_practitioner()}
          </DropdownMenuItem>
        )}
        {row.source.kind === "invitation" && !row.source.expired ? (
          <DropdownMenuItem
            className="cursor-pointer whitespace-nowrap"
            onClick={() => onCopyInvitationLink(row)}
            data-testid={`member-copy-invitation-link-${row.key}`}
          >
            {m.settings_member_copy_link()}
          </DropdownMenuItem>
        ) : null}
        {row.source.kind === "invitation" && row.source.expired ? (
          <DropdownMenuItem
            className="cursor-pointer whitespace-nowrap"
            onClick={() => onRenewInvitation(row)}
            data-testid={`member-renew-invitation-${row.key}`}
          >
            {m.settings_member_renew_invitation()}
          </DropdownMenuItem>
        ) : null}
        {row.source.kind === "invitation" ? (
          <DropdownMenuItem
            className="cursor-pointer whitespace-nowrap"
            onClick={() =>
              onRevokeInvitation(row.source.kind === "invitation" ? row.source.invitationId : "")
            }
            data-testid={`member-revoke-invitation-${row.key}`}
          >
            {m.settings_member_revoke_invitation()}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
