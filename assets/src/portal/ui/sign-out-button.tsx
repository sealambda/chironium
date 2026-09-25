import { LogOut } from "lucide-react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";

function csrfToken(): string {
  return document.querySelector("meta[name='csrf-token']")?.getAttribute("content") ?? "";
}

/**
 * Ends the patient's session. Sessions last days, so this matters on shared
 * devices. A plain form POST keeps the server in charge of the redirect.
 */
export function SignOutButton() {
  return (
    <form method="post" action="/portal/sign-out">
      <input type="hidden" name="_csrf_token" value={csrfToken()} />
      <Button type="submit" variant="ghost" size="sm">
        <LogOut />
        {m.portal_sign_out()}
      </Button>
    </form>
  );
}
