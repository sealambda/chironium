import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Building2 } from "lucide-react";
import { useMemo, useState } from "react";

import { fetchOrganizationSettings, ORG_SETTINGS_QUERY_KEY } from "@/features/org/api/org-api";
import { useOrg } from "@/features/org/hooks/use-org";
import { InviteMemberDialog } from "@/features/org/ui/invite-member-dialog";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Loading } from "@/shared/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

type MemberRow = {
  key: string;
  primary: string;
  secondary: string | null;
  role: string;
  status: string;
};

function isPendingInvitationState(state: string): boolean {
  return state.toLowerCase() === "pending";
}

function formatOrgRoleLabel(role: string | null | undefined): string {
  if (!role) {
    return m.settings_invite_role_member();
  }
  const normalized = role.trim().replaceAll("-", "_").toUpperCase();
  if (normalized === "POWER_USER") {
    return m.settings_invite_role_power_user();
  }
  return m.settings_invite_role_member();
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { selectedOrg, loading: orgLoading } = useOrg();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    data: organization,
    isLoading,
    error: settingsError,
  } = useQuery({
    queryKey: [...ORG_SETTINGS_QUERY_KEY, selectedOrg?.id],
    queryFn: () => fetchOrganizationSettings(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg?.id),
  });

  const memberRows = useMemo((): MemberRow[] => {
    if (!organization) {
      return [];
    }

    const pendingByEmail = new Set<string>();
    for (const invitation of organization.invitations) {
      if (!isPendingInvitationState(invitation.state)) {
        continue;
      }
      const inviteEmail = invitation.email?.trim();
      if (!inviteEmail) {
        continue;
      }
      pendingByEmail.add(inviteEmail.toLowerCase());
    }

    const activeByEmail = new Map<string, MemberRow>();

    const addActiveMember = (
      member: { id: string; email: string; name: string | null },
      role: string,
    ) => {
      const trimmedEmail = member.email.trim();
      if (!trimmedEmail) {
        return;
      }

      const lowerEmail = trimmedEmail.toLowerCase();
      if (activeByEmail.has(lowerEmail)) {
        return;
      }

      const displayName = member.name?.trim() ?? "";
      const primary = displayName || trimmedEmail;
      const secondary = displayName ? trimmedEmail : null;

      activeByEmail.set(lowerEmail, {
        key: member.id,
        primary,
        secondary,
        role,
        status: pendingByEmail.has(lowerEmail)
          ? m.settings_member_status_pending()
          : m.settings_member_status_active(),
      });
    };

    addActiveMember(organization.owner, m.settings_member_status_owner());
    for (const ou of organization.organizationUsers) {
      addActiveMember(ou.user, formatOrgRoleLabel(ou.role));
    }

    const activeRows = [...activeByEmail.values()];

    const pendingRows = organization.invitations.flatMap((invitation) => {
      if (!isPendingInvitationState(invitation.state)) {
        return [];
      }

      const inviteEmail = invitation.email?.trim() ?? "";
      if (!inviteEmail) {
        return [];
      }

      const lowerEmail = inviteEmail.toLowerCase();
      if (activeByEmail.has(lowerEmail)) {
        return [];
      }

      return [
        {
          key: invitation.id,
          primary: inviteEmail,
          secondary: null,
          role: formatOrgRoleLabel(invitation.role),
          status: m.settings_member_status_pending(),
        } satisfies MemberRow,
      ];
    });

    return [...activeRows, ...pendingRows];
  }, [organization]);

  if (orgLoading || isLoading) {
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
        <h1 className="font-bold text-2xl text-foreground uppercase tracking-wide">
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
          <Button onClick={() => setIsDialogOpen(true)}>{m.settings_invite_member()}</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.settings_members_user_col()}</TableHead>
                <TableHead>{m.settings_members_role_col()}</TableHead>
                <TableHead>{m.settings_members_status_col()}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberRows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{row.primary}</span>
                      {row.secondary ? (
                        <span className="text-muted-foreground text-sm">{row.secondary}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedOrg ? (
        <InviteMemberDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          organizationId={selectedOrg.id}
          onInvited={() =>
            queryClient.invalidateQueries({
              queryKey: [...ORG_SETTINGS_QUERY_KEY, selectedOrg.id],
            })
          }
        />
      ) : null}
    </div>
  );
}
