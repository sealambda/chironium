import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";
import { OrgStoreSync } from "@/features/org/store/org-store-sync";
import { AppShell } from "@/shared/layout/app-shell";
import { AuthLoading } from "@/shared/ui/auth-loading";

/**
 * Authenticated layout route.
 *
 * Note: Auth guards have been removed because Phoenix handles
 * authentication before the PWA loads. If you're seeing this route,
 * you're authenticated - guaranteed by the backend.
 *
 * AppShell is rendered here (not in root) so that public routes
 * can render without the navigation shell.
 */
export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

/**
 * Layout component for authenticated routes.
 * Wraps all authenticated pages in the AppShell with navigation.
 * Uses Suspense to handle lazy-loaded page components.
 */
function AuthenticatedLayout() {
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
