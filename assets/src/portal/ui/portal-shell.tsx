import { SiGithub } from "@icons-pack/react-simple-icons";
import type { ReactNode } from "react";

import * as m from "@/paraglide/messages";
import { SignOutButton } from "@/portal/ui/sign-out-button";
import { buttonVariants } from "@/shared/ui/button";
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
        <span className="truncate text-sm font-medium text-muted-foreground">
          {organizationName}
        </span>
        <div className="flex items-center gap-1">
          {runtimeConfig.sourceCodeUrl ? (
            <a
              href={runtimeConfig.sourceCodeUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={m.nav_source_code()}
              title={m.nav_source_code()}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <SiGithub size={16} aria-hidden />
            </a>
          ) : null}
          {signedIn ? <SignOutButton /> : null}
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-12">{children}</main>
    </div>
  );
}
