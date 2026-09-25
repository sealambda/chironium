import { LinkIcon } from "lucide-react";

import * as m from "@/paraglide/messages";
import { PortalMessage } from "@/portal/ui/portal-message";

export function LinkExpiredPage() {
  return (
    <PortalMessage
      icon={LinkIcon}
      title={m.portal_expired_title()}
      body={m.portal_expired_body()}
    />
  );
}
