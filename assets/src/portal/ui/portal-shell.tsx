import type { ReactNode } from "react";

import { SignOutButton } from "@/portal/ui/sign-out-button";

interface PortalShellProps {
  organizationName?: string | null;
  signedIn?: boolean;
  children: ReactNode;
}

/** A single centered column: the portal is used mostly on phones. */
export function PortalShell({
  organizationName,
  signedIn = false,
  children,
}: Readonly<PortalShellProps>) {
  return (
    <div className="min-h-full bg-muted/40">
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4">
        <span className="truncate font-medium text-muted-foreground text-sm">
          {organizationName}
        </span>
        {signedIn ? <SignOutButton /> : null}
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-12">{children}</main>
    </div>
  );
}
