import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Building2 } from "lucide-react";
import { useMemo, useState } from "react";

import { queryClient } from "@/app/providers/query-client";
import { fetchOrganizationSettings } from "@/features/org/api/org-api";
import { useOrg } from "@/features/org/hooks/use-org";
import {
  EditMemberRoleDialog,
  type EditMemberRoleTarget,
} from "@/features/org/ui/edit-member-role-dialog";
import { InviteMemberDialog } from "@/features/org/ui/invite-member-dialog";
import {
  MakeMemberPractitionerDialog,
  type MakePractitionerTarget,
} from "@/features/org/ui/make-member-practitioner-dialog";
import { SettingsMemberActionsMenu } from "@/features/org/ui/settings-member-actions-menu";
import { SettingsMemberRoleStatusFields } from "@/features/org/ui/settings-member-role-status-fields";
import {
  buildSettingsMemberRows,
  canManageOrgMembers,
  memberRowHasActions,
  type SettingsMemberTableRow,
} from "@/features/org/utils/settings-member-table-model";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Loading } from "@/shared/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { orgSettingsQueryKey, practitionersBulkReassignQueryKey } from "@/shared/utils/query-keys";
import { cn } from "@/shared/utils/utils";

export function SettingsPage() {
  const { user: currentUser } = useCurrentUser();
  const { selectedOrg, loading: orgLoading } = useOrg();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editRoleTarget, setEditRoleTarget] = useState<EditMemberRoleTarget | null>(null);
  const [makePractitionerTarget, setMakePractitionerTarget] =
    useState<MakePractitionerTarget | null>(null);

  const {
    data: organization,
    isLoading: settingsLoading,
    error: settingsError,
  } = useQuery({
    queryKey: orgSettingsQueryKey(selectedOrg?.id ?? ""),
    queryFn: () => fetchOrganizationSettings(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg?.id),
  });

  const memberRows = useMemo((): SettingsMemberTableRow[] => {
    if (!organization) {
      return [];
    }
    return buildSettingsMemberRows(organization);
  }, [organization]);

  const canManageMembers = useMemo(
    () => canManageOrgMembers(organization, currentUser?.id),
    [organization, currentUser?.id],
  );

  const hasVisibleMembers = memberRows.length > 0;

  const invalidateSettings = () =>
    queryClient.invalidateQueries({
      queryKey: orgSettingsQueryKey(selectedOrg?.id ?? ""),
    });

  const invalidateAfterPractitionerLinked = async () => {
    await invalidateSettings();
    if (selectedOrg?.id) {
      await queryClient.invalidateQueries({
        queryKey: practitionersBulkReassignQueryKey(selectedOrg.id),
      });
    }
  };

  if (orgLoading || settingsLoading) {
    return <Loading />;
  }

  if (!selectedOrg) {
    return <EmptyState icon={Building2} title={m.no_org()} description={m.no_org_desc()} />;
  }

  if (settingsError) {
    const message = settingsError instanceof Error ? settingsError.message : String(settingsError);
    return <EmptyState icon={AlertCircle} title={m.settings_error()} description={message} />;
  }

  return (
    <div className="space-y-4 pt-7">
      <header>
        <h1
          className="font-bold text-2xl text-foreground uppercase tracking-wide"
          data-testid="settings-heading"
        >
          {m.settings_title()}
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{m.settings_org_section_title()}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-[180px_1fr]">
            <dt className="text-muted-foreground">{m.settings_org_name_label()}</dt>
            <dd>{organization?.name ?? selectedOrg.name}</dd>

            <dt className="text-muted-foreground">{m.settings_org_id_label()}</dt>
            <dd className="break-all">{organization?.id ?? selectedOrg.id}</dd>

            <dt className="text-muted-foreground">{m.settings_org_slug_label()}</dt>
            <dd>{organization?.slug ?? selectedOrg.slug}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{m.settings_members_section_title()}</CardTitle>
          {hasVisibleMembers ? (
            <Button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              data-testid="settings-invite-member-button"
            >
              {m.settings_invite_member()}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {hasVisibleMembers ? (
            <div className="space-y-3">
              <div className="space-y-3 lg:hidden">
                {memberRows.map((row: SettingsMemberTableRow) => {
                  const showActionSlot = canManageMembers && memberRowHasActions(row);
                  return (
                    <div
                      key={row.key}
                      className="relative rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm"
                    >
                      {showActionSlot ? (
                        <div className="absolute end-3 top-3">
                          <SettingsMemberActionsMenu
                            row={row}
                            onEditRole={setEditRoleTarget}
                            onMakePractitioner={setMakePractitionerTarget}
                          />
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "flex min-w-0 flex-col gap-1",
                          showActionSlot ? "pe-10" : undefined,
                        )}
                      >
                        <span className="font-medium">{row.primary}</span>
                        {row.secondary ? (
                          <span className="text-muted-foreground text-sm">{row.secondary}</span>
                        ) : null}
                        <SettingsMemberRoleStatusFields row={row} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{m.settings_members_user_col()}</TableHead>
                      <TableHead>{m.settings_members_role_col()}</TableHead>
                      <TableHead>{m.settings_members_status_col()}</TableHead>
                      {canManageMembers ? (
                        <TableHead className="w-14 text-end">
                          <span className="sr-only">{m.settings_members_actions_aria()}</span>
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberRows.map((row: SettingsMemberTableRow) => (
                      <TableRow key={row.key}>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{row.primary}</span>
                            {row.secondary ? (
                              <span className="text-muted-foreground text-sm">{row.secondary}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{row.roleDisplay}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        {canManageMembers ? (
                          <TableCell className="text-end">
                            <SettingsMemberActionsMenu
                              row={row}
                              onEditRole={setEditRoleTarget}
                              onMakePractitioner={setMakePractitionerTarget}
                            />
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                {m.settings_members_not_visible_title()}
              </p>
              <p className="text-muted-foreground">{m.settings_members_not_visible_desc()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrg ? (
        <>
          <InviteMemberDialog
            open={isInviteOpen}
            onOpenChange={setIsInviteOpen}
            organizationId={selectedOrg.id}
            onInvited={invalidateSettings}
          />
          <EditMemberRoleDialog
            open={editRoleTarget !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditRoleTarget(null);
              }
            }}
            organizationId={selectedOrg.id}
            target={editRoleTarget}
            onSaved={invalidateSettings}
          />
          <MakeMemberPractitionerDialog
            open={makePractitionerTarget !== null}
            onOpenChange={(open) => {
              if (!open) {
                setMakePractitionerTarget(null);
              }
            }}
            organizationId={selectedOrg.id}
            target={makePractitionerTarget}
            onSaved={invalidateAfterPractitionerLinked}
          />
        </>
      ) : null}
    </div>
  );
}
