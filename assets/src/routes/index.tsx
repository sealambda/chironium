import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Index route redirects to customers, preserving search params.
 * Preserving search is required for deep links such as invitation emails
 * (`/app?inviteCode=XYZ`), where downstream layouts (e.g. the pending
 * invitations dialog) read the code from the URL.
 *
 * No auth check needed - Phoenix guarantees authentication.
 */
export const Route = createFileRoute("/")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/customers", search });
  },
});
