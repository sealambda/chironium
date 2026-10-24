import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";

import { CreateOrgModal } from "@/features/org/ui/create-org-modal";
import { NoOrgScreen } from "@/features/org/ui/no-org-screen";
import { PendingInvitationsDialog } from "@/features/org/ui/pending-invitations-dialog";
import { AppShell } from "@/shared/layout/app-shell";
import { OrgStoreSync } from "@/shared/session/org-store-sync";
import { useOrg } from "@/shared/session/use-org";
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
