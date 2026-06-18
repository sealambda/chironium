import { LogOut } from "lucide-react";
import { useEffect } from "react";

import * as m from "@/paraglide/messages";
import { useDetailMode } from "@/shared/layout/detail-context";
import { useCurrentUser } from "@/shared/session/use-current-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { LanguageToggle } from "@/shared/ui/language-toggle";
import { Skeleton } from "@/shared/ui/skeleton";
import { getUserInitials } from "@/shared/utils/name-utils";
import { AUTH_URLS } from "@/shared/utils/url-utils";

export function ProfilePage() {
  const { user, isLoading } = useCurrentUser();
  const { setHeaderContent } = useDetailMode();

  useEffect(() => {
    setHeaderContent(
      <div className="ml-auto flex w-full justify-end">
        <Button
          variant="link"
          onClick={() => {
            globalThis.location.href = AUTH_URLS.signOut;
          }}
        >
          <LogOut className="size-4" data-icon="inline-start" />
          <span className="hidden sm:inline">{m.nav_sign_out()}</span>
        </Button>
      </div>,
    );

    return () => {
      setHeaderContent(null);
    };
  }, [setHeaderContent]);

  if (isLoading) {
    return (
      <div className="flex min-h-svh flex-col items-center pt-10">
        <Skeleton className="h-28 w-28 rounded-full" />
        <Skeleton className="mt-4 h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center pt-10">
      <Avatar className="h-28 w-28 border border-border/60">
        <AvatarImage
          src={user?.picture ?? undefined}
          alt={user?.name || user?.email || m.nav_profile()}
          referrerPolicy="no-referrer"
        />
        <AvatarFallback className="bg-primary/10 font-semibold text-2xl text-primary">
          {getUserInitials(user?.name, user?.email)}
        </AvatarFallback>
      </Avatar>
      <div className="mt-4 text-center">
        <h1 className="font-bold text-2xl text-foreground">{user?.name || m.nav_profile()}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{user?.email ?? "-"}</p>
        <div className="mt-3 flex justify-center">
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
}
