import type { LucideIcon } from "lucide-react";

import { PortalShell } from "@/portal/ui/portal-shell";
import { Card, CardContent } from "@/shared/ui/card";

interface PortalMessageProps {
  icon: LucideIcon;
  title: string;
  body: string;
}

/** A full-page message for the portal's end states. */
export function PortalMessage({ icon: Icon, title, body }: Readonly<PortalMessageProps>) {
  return (
    <PortalShell>
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <Icon className="size-10 text-muted-foreground" aria-hidden />
          <h1 className="font-semibold text-xl">{title}</h1>
          <p className="text-muted-foreground">{body}</p>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
