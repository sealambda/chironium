import { CircleCheck } from "lucide-react";

import * as m from "@/paraglide/messages";
import { PortalMessage } from "@/portal/ui/portal-message";

export function DonePage() {
  return (
    <PortalMessage icon={CircleCheck} title={m.portal_done_title()} body={m.portal_done_body()} />
  );
}
