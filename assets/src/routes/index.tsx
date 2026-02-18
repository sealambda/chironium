import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Index route redirects to customers.
 * No auth check needed - Phoenix guarantees authentication.
 */
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/customers" });
  },
});
