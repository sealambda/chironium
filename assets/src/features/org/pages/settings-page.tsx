import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Building2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { fetchOrganizationSettings, inviteUserToOrganization } from "@/features/org/api/org-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Loading } from "@/shared/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { emailRequiredSchema } from "@/shared/utils/email-validation";

const ORG_SETTINGS_QUERY_KEY = ["org", "settings"] as const;

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

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { selectedOrg, loading: orgLoading } = useOrg();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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
    for (const member of organization.users) {
      addActiveMember(member, m.settings_member_status_member());
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
          role: m.settings_member_status_member(),
          status: m.settings_member_status_pending(),
        } satisfies MemberRow,
      ];
    });

    return [...activeRows, ...pendingRows];
  }, [organization]);

  const handleOpenInvite = () => {
    setInviteError(null);
    setEmail("");
    setIsDialogOpen(true);
  };

  const handleInvite = async () => {
    if (!selectedOrg?.id) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const parsedEmail = emailRequiredSchema.safeParse(normalizedEmail);
    if (!parsedEmail.success) {
      setInviteError(parsedEmail.error.issues[0]?.message ?? m.validation_email_format());
      return;
    }

    setInviteError(null);
    setIsInviting(true);
    try {
      await inviteUserToOrganization({
        organizationId: selectedOrg.id,
        email: normalizedEmail,
      });
      toast.success(m.settings_invite_success());
      setIsDialogOpen(false);
      await queryClient.invalidateQueries({
        queryKey: [...ORG_SETTINGS_QUERY_KEY, selectedOrg.id],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : m.settings_invite_error();
      setInviteError(message);
    } finally {
      setIsInviting(false);
    }
  };

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
          <Button onClick={handleOpenInvite}>{m.settings_invite_member()}</Button>
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

      <Dialog
        open={isDialogOpen}
        onOpenChange={(nextOpen) => {
          setIsDialogOpen(nextOpen);
          if (!nextOpen) {
            setInviteError(null);
            setEmail("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.settings_invite_dialog_title()}</DialogTitle>
            <DialogDescription>{m.settings_invite_dialog_desc()}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="invite-email">{m.settings_invite_email_label()}</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder={m.settings_invite_email_placeholder()}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>

          {inviteError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {inviteError}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
              {m.common_cancel()}
            </Button>
            <Button type="button" onClick={handleInvite} disabled={isInviting}>
              {isInviting ? m.common_saving() : m.settings_invite_submit()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
