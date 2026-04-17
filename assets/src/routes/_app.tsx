import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

import { useOrg } from "@/features/org/hooks/use-org";
import { OrgStoreSync } from "@/features/org/store/org-store-sync";
import { CreateOrgModal } from "@/features/org/ui/create-org-modal";
import { PendingInvitationsDialog } from "@/features/org/ui/pending-invitations-dialog";
import * as m from "@/paraglide/messages";
import { AppShell } from "@/shared/layout/app-shell";
import { EmptyState } from "@/shared/ui/empty-state";
import { Loading } from "@/shared/ui/loading";

function getInviteCodeFromUrl(): string {
  const search = new URLSearchParams(globalThis.location.search);
  return search.get("inviteCode")?.trim() ?? "";
}

function clearInviteCodeFromUrl(): void {
  const currentUrl = new URL(globalThis.location.href);
  if (!currentUrl.searchParams.has("inviteCode")) {
    return;
  }
  currentUrl.searchParams.delete("inviteCode");
  globalThis.history.replaceState(globalThis.history.state, "", currentUrl.toString());
}

/**
 * App layout route.
 *
 * Provides the main application shell with navigation.
 * Auth is handled by Phoenix before the PWA loads.
 */
export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

/**
 * Shown when the authenticated user has no organization membership.
 * Prompts them to create their first organization or request an invitation.
 */
function NoOrgScreen({
  onCreateOrgClick,
  onJoinOrgClick,
}: Readonly<{ onCreateOrgClick: () => void; onJoinOrgClick: () => void }>) {
  return (
    <div className="flex h-[calc(100svh-4rem)] items-center justify-center">
      <div className="w-full max-w-lg space-y-3">
        <EmptyState
          icon={Building2}
          title={m.org_no_access_title()}
          description={m.org_no_access_desc()}
          actions={[
            {
              label: m.org_join_by_invitation(),
              testId: "no-org-join-by-invitation-button",
              onAction: onJoinOrgClick,
            },
            {
              label: m.org_no_access_action(),
              testId: "no-org-create-organization-button",
              onAction: onCreateOrgClick,
            },
          ]}
          className="w-full"
        />
      </div>
    </div>
  );
}

/**
 * Renders the page content, or the no-organization empty state
 * when the user has no accessible organizations.
 */
function AppContent({
  onCreateOrgClick,
  onJoinOrgClick,
}: Readonly<{ onCreateOrgClick: () => void; onJoinOrgClick: () => void }>) {
  const { availableOrgs, loading } = useOrg();

  if (!loading && availableOrgs.length === 0) {
    return <NoOrgScreen onCreateOrgClick={onCreateOrgClick} onJoinOrgClick={onJoinOrgClick} />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <Outlet />
    </Suspense>
  );
}

/**
 * Layout component wrapping pages in AppShell with navigation.
 */
function AppLayout() {
  const [isJoinOrgDialogOpen, setIsJoinOrgDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isCreateOrgDialogOpen, setIsCreateOrgDialogOpen] = useState(false);

  useEffect(() => {
    const initialInviteCodeFromUrl = getInviteCodeFromUrl();
    if (initialInviteCodeFromUrl === "") {
      return;
    }

    setInviteCode(initialInviteCodeFromUrl);
    setIsJoinOrgDialogOpen(true);
  }, []);

  const handleJoinOrgDialogOpenChange = (isOpen: boolean) => {
    setIsJoinOrgDialogOpen(isOpen);
    if (isOpen) {
      return;
    }
    clearInviteCodeFromUrl();
    setInviteCode("");
  };

  return (
    <>
      <OrgStoreSync />
      <PendingInvitationsDialog
        open={isJoinOrgDialogOpen}
        onOpenChange={handleJoinOrgDialogOpenChange}
        initialInviteCode={inviteCode}
      />
      <CreateOrgModal open={isCreateOrgDialogOpen} onOpenChange={setIsCreateOrgDialogOpen} />
      <AppShell
        onCreateOrgClick={() => setIsCreateOrgDialogOpen(true)}
        onJoinOrgClick={() => setIsJoinOrgDialogOpen(true)}
      >
        <AppContent
          onCreateOrgClick={() => setIsCreateOrgDialogOpen(true)}
          onJoinOrgClick={() => setIsJoinOrgDialogOpen(true)}
        />
      </AppShell>
    </>
  );
}
