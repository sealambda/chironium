import { useCallback, useState } from "react";

import { DonePage } from "@/portal/pages/done-page";
import { LinkExpiredPage } from "@/portal/pages/link-expired-page";
import { RequestPage } from "@/portal/pages/request-page";
import { SignedOutPage } from "@/portal/pages/signed-out-page";

export type PortalPath = "/portal" | "/portal/done" | "/portal/link-expired" | "/portal/signed-out";

/** A four-page app doesn't need a router; the server serves each path. */
export function PortalApp() {
  const [path, setPath] = useState(() => window.location.pathname);

  const navigate = useCallback((to: PortalPath) => {
    window.history.replaceState(null, "", to);
    setPath(to);
  }, []);

  switch (path) {
    case "/portal":
      return <RequestPage navigate={navigate} />;
    case "/portal/done":
      return <DonePage />;
    case "/portal/signed-out":
      return <SignedOutPage />;
    default:
      return <LinkExpiredPage />;
  }
}
