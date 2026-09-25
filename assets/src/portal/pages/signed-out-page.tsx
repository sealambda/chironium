import { LogOut } from "lucide-react";

import * as m from "@/paraglide/messages";
import { PortalMessage } from "@/portal/ui/portal-message";

export function SignedOutPage() {
  return (
    <PortalMessage
      icon={LogOut}
      title={m.portal_signed_out_title()}
      body={m.portal_signed_out_body()}
    />
  );
}
