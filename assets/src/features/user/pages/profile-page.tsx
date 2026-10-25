import { LogOut } from "lucide-react";

import * as m from "@/paraglide/messages";
import { useCurrentUser } from "@/shared/session/use-current-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { LanguageToggle } from "@/shared/ui/language-toggle";
import { Skeleton } from "@/shared/ui/skeleton";
import { getUserInitials } from "@/shared/utils/name-utils";
import { submitForm } from "@/shared/utils/request-utils";
import { AUTH_URLS } from "@/shared/utils/url-utils";

export function ProfilePage() {
  const { user, isLoading } = useCurrentUser();
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
        <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
          {getUserInitials(user?.name, user?.email)}
        </AvatarFallback>
      </Avatar>
      <div className="mt-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">{user?.name || m.nav_profile()}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email ?? "-"}</p>
        <div className="mt-3 flex justify-center">
          <LanguageToggle />
        </div>
        <Button
          variant="link"
          className="mt-6"
          onClick={() => {
            submitForm(AUTH_URLS.signOut, "delete");
          }}
        >
          <LogOut className="size-4" data-icon="inline-start" />
          {m.nav_sign_out()}
        </Button>
      </div>
    </div>
  );
}
