import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { Suspense, useState } from "react";

import { useOrg } from "@/features/org/hooks/use-org";
import { OrgStoreSync } from "@/features/org/store/org-store-sync";
import { CreateOrgModal } from "@/features/org/ui/create-org-modal";
import * as m from "@/paraglide/messages";
import { AppShell } from "@/shared/layout/app-shell";
import { AuthLoading } from "@/shared/ui/auth-loading";
import { EmptyState } from "@/shared/ui/empty-state";

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
function NoOrgScreen() {
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);

  return (
    <>
      <div className="flex h-[calc(100svh-4rem)] items-center justify-center">
        <EmptyState
          icon={Building2}
          title={m.org_no_access_title()}
          description={m.org_no_access_desc()}
          actionLabel={m.org_no_access_action()}
          onAction={() => setIsCreateOrgOpen(true)}
          className="w-full max-w-lg"
        />
      </div>
      <CreateOrgModal open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen} />
    </>
  );
}

/**
 * Renders the page content, or the no-organization empty state
 * when the user has no accessible organizations.
 */
function AppContent() {
  const { availableOrgs, loading } = useOrg();

  if (!loading && availableOrgs.length === 0) {
    return <NoOrgScreen />;
  }

  return (
    <Suspense fallback={<AuthLoading />}>
      <Outlet />
    </Suspense>
  );
}

/**
 * Layout component wrapping pages in AppShell with navigation.
 */
function AppLayout() {
  return (
    <>
      <OrgStoreSync />
      <AppShell>
        <AppContent />
      </AppShell>
    </>
  );
}
