import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Building2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { queryClient } from "@/app/providers/query-client";
import {
  fetchOrganizationSettings,
  type OrganizationSettingsData,
  renewInvitation,
  revokeInvitation,
  updateOrganizationSettings,
} from "@/features/org/api/org-api";
import {
  EditMemberRoleDialog,
  type EditMemberRoleTarget,
} from "@/features/org/ui/edit-member-role-dialog";
import {
  InvitationLinkDialog,
  type InvitationLinkTarget,
} from "@/features/org/ui/invitation-link-dialog";
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
import * as m from "@/paraglide/messages";
import type { Locale } from "@/paraglide/runtime";
import { toLocaleOrDefault } from "@/shared/i18n/locales";
import { useCurrentUser } from "@/shared/session/use-current-user";
import { useOrg } from "@/shared/session/use-org";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Loading } from "@/shared/ui/loading";
import { LocaleFlagLabel, LocaleSelect } from "@/shared/ui/locale-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
} from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { orgSettingsQueryKey, practitionersBulkReassignQueryKey } from "@/shared/utils/query-keys";
import { cn } from "@/shared/utils/utils";

interface OrgLanguageFieldProps {
  value: Locale;
  editable: boolean;
  onChange: (locale: Locale | null) => void;
}

function OrgLanguageField({ value, editable, onChange }: Readonly<OrgLanguageFieldProps>) {
  if (!editable) {
    return <LocaleFlagLabel locale={value} />;
  }

  return (
    <LocaleSelect
      value={value}
      onChange={onChange}
      triggerClassName="w-40"
      data-testid="settings-org-language-select"
    />
  );
}

interface OrgTimezoneFieldProps {
  value: string;
  editable: boolean;
  onChange: (timezone: string | null) => void;
}

function OrgTimezoneField({ value, editable, onChange }: Readonly<OrgTimezoneFieldProps>) {
  // The stored zone may be a legacy link, such as `Etc/UTC`, missing from the canonical list.
  const timezones = useMemo(() => {
    const supported = Intl.supportedValuesOf("timeZone");
    return supported.includes(value) ? supported : [value, ...supported];
  }, [value]);

  if (!editable) {
    return <span>{value}</span>;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-64" data-testid="settings-org-timezone-select">
        {value}
      </SelectTrigger>
      <SelectPositioner>
        <SelectContent>
          {timezones.map((timezone) => (
            <SelectItem key={timezone} value={timezone}>
              {timezone}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPositioner>
    </Select>
  );
}

interface OrganizationCardProps {
  organization: OrganizationSettingsData | null | undefined;
  selectedOrg: { id: string; name: string; slug: string; timezone: string };
  canEdit: boolean;
  onSettingsChanged: () => Promise<void> | void;
}

function OrganizationCard({
  organization,
  selectedOrg,
  canEdit,
  onSettingsChanged,
}: Readonly<OrganizationCardProps>) {
  const orgLocaleValue: Locale = toLocaleOrDefault(organization?.preferredLocale);

  const handleLocaleChange = async (value: Locale | null) => {
    if (!organization || value === organization.preferredLocale || value === null) {
      return;
    }

    try {
      await updateOrganizationSettings({
        organizationId: organization.id,
        preferredLocale: value,
      });
      toast.success(m.settings_org_language_update_success());
      await onSettingsChanged();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : m.settings_org_language_update_error();
      toast.error(message);
    }
  };

  const handleTimezoneChange = async (value: string | null) => {
    if (!organization || value === organization.timezone || value === null) {
      return;
    }

    try {
      await updateOrganizationSettings({ organizationId: organization.id, timezone: value });
      toast.success(m.settings_org_timezone_update_success());
      await onSettingsChanged();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : m.settings_org_timezone_update_error();
      toast.error(message);
    }
  };

  return (
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

          <dt className="text-muted-foreground">{m.settings_org_language_label()}</dt>
          <dd>
            <OrgLanguageField
              value={orgLocaleValue}
              editable={canEdit}
              onChange={(locale) => {
                void handleLocaleChange(locale);
              }}
            />
          </dd>

          <dt className="text-muted-foreground">{m.settings_org_timezone_label()}</dt>
          <dd>
            <OrgTimezoneField
              value={organization?.timezone ?? selectedOrg.timezone}
              editable={canEdit}
              onChange={(timezone) => {
                void handleTimezoneChange(timezone);
              }}
            />
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const { user: currentUser } = useCurrentUser();
  const { selectedOrg, loading: orgLoading, refreshOrgs } = useOrg();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editRoleTarget, setEditRoleTarget] = useState<EditMemberRoleTarget | null>(null);
  const [makePractitionerTarget, setMakePractitionerTarget] =
    useState<MakePractitionerTarget | null>(null);
  const [linkTarget, setLinkTarget] = useState<InvitationLinkTarget | null>(null);
  const [isLinkOpen, setIsLinkOpen] = useState(false);

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

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!selectedOrg?.id) {
      return;
    }

    try {
      await revokeInvitation({
        organizationId: selectedOrg.id,
        invitationId,
      });

      toast.success(m.settings_revoke_invitation_success());
      await invalidateSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : m.settings_revoke_invitation_error();
      toast.error(message);
    }
  };

  const openInvitationLink = (target: InvitationLinkTarget) => {
    setLinkTarget(target);
    setIsLinkOpen(true);
  };

  const invitationLinkTarget = (row: SettingsMemberTableRow): InvitationLinkTarget | null =>
    row.source.kind === "invitation"
      ? {
          invitationId: row.source.invitationId,
          email: row.primary,
          boundToEmail: row.orgRole === "POWER_USER" || row.hasPractitionerGrant,
        }
      : null;

  const handleCopyInvitationLink = (row: SettingsMemberTableRow) => {
    const target = invitationLinkTarget(row);
    if (target) {
      openInvitationLink(target);
    }
  };

  const handleRenewInvitation = async (row: SettingsMemberTableRow) => {
    const target = invitationLinkTarget(row);
    if (!selectedOrg?.id || !target) {
      return;
    }

    try {
      const link = await renewInvitation({
        organizationId: selectedOrg.id,
        invitationId: target.invitationId,
      });
      openInvitationLink({ ...target, link });
      await invalidateSettings();
    } catch {
      toast.error(m.settings_renew_invitation_error());
    }
  };

  const memberActionsMenu = (row: SettingsMemberTableRow) => (
    <SettingsMemberActionsMenu
      row={row}
      onEditRole={setEditRoleTarget}
      onMakePractitioner={setMakePractitionerTarget}
      onRevokeInvitation={(invitationId) => {
        void handleRevokeInvitation(invitationId);
      }}
      onCopyInvitationLink={handleCopyInvitationLink}
      onRenewInvitation={(target) => {
        void handleRenewInvitation(target);
      }}
    />
  );

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
          className="text-2xl font-bold tracking-wide text-foreground uppercase"
          data-testid="settings-heading"
        >
          {m.settings_title()}
        </h1>
      </header>

      <OrganizationCard
        organization={organization}
        selectedOrg={selectedOrg}
        canEdit={canManageMembers}
        onSettingsChanged={async () => {
          await invalidateSettings();
          await refreshOrgs();
        }}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{m.settings_members_section_title()}</CardTitle>
          {hasVisibleMembers && canManageMembers ? (
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
                        <div className="absolute end-3 top-3">{memberActionsMenu(row)}</div>
                      ) : null}
                      <div
                        className={cn(
                          "flex min-w-0 flex-col gap-1",
                          showActionSlot ? "pe-10" : undefined,
                        )}
                      >
                        <span className="font-medium">{row.primary}</span>
                        {row.secondary ? (
                          <span className="text-sm text-muted-foreground">{row.secondary}</span>
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
                              <span className="text-sm text-muted-foreground">{row.secondary}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{row.roleDisplay}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        {canManageMembers ? (
                          <TableCell className="text-end">{memberActionsMenu(row)}</TableCell>
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
            organizationName={organization?.name ?? selectedOrg.name}
            onInvited={invalidateAfterPractitionerLinked}
          />
          <InvitationLinkDialog
            organizationId={selectedOrg.id}
            organizationName={organization?.name ?? selectedOrg.name}
            target={linkTarget}
            open={isLinkOpen}
            onOpenChange={setIsLinkOpen}
            onClosed={() => setLinkTarget(null)}
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
