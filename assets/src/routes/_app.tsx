import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";

import { OrgStoreSync } from "@/features/org/store/org-store-sync";
import { AppShell } from "@/shared/layout/app-shell";
import { AuthLoading } from "@/shared/ui/auth-loading";

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
 * Layout component wrapping pages in AppShell with navigation.
 */
function AppLayout() {
  return (
    <>
      <OrgStoreSync />
      <AppShell>
        <Suspense fallback={<AuthLoading />}>
          <Outlet />
        </Suspense>
      </AppShell>
    </>
  );
}
