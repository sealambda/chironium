import type { ReactNode } from "react";

import * as m from "@/paraglide/messages";
import { SignOutButton } from "@/portal/ui/sign-out-button";
import { runtimeConfig } from "@/shared/utils/runtime-config";

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
      {runtimeConfig.sourceCodeUrl ? (
        <footer className="pb-6 text-center text-muted-foreground text-xs">
          <a href={runtimeConfig.sourceCodeUrl} className="underline-offset-4 hover:underline">
            {m.nav_source_code()}
          </a>
        </footer>
      ) : null}
    </div>
  );
}
