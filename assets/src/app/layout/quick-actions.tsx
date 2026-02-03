import { useRouterState } from "@tanstack/react-router";
import { Bell, UserPlus } from "lucide-react";
import { useCustomersStore } from "@/features/customers/store/customers-store";
import { Button } from "@/shared/ui/button";

/**
 * Context-relevant quick-actions component for TopNav.
 * Renders different action buttons based on the current route:
 * - /customers: Add Customer button
 * - /dashboard: Notification bell (future)
 *
 * Follows Apple HIG and Material Design 3 patterns for trailing actions.
 */
export function QuickActions() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const openCreateSheet = useCustomersStore((state) => state.openCreateSheet);

  // Customer route: Add Customer button
  if (currentPath.startsWith("/customers")) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        aria-label="Add customer"
        onClick={openCreateSheet}
      >
        <UserPlus className="size-5" />
      </Button>
    );
  }

  // Dashboard route: Notification bell (future)
  if (currentPath.startsWith("/dashboard")) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        aria-label="View notifications"
        onClick={() => {
          // TODO: Open notifications
        }}
      >
        <Bell className="size-5" />
      </Button>
    );
  }

  // No actions for other routes
  return null;
}
