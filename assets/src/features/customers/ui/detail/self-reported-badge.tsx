import { UserRound } from "lucide-react";

import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";

/** Marks values the patient entered themselves, through a questionnaire. */
export function SelfReportedBadge({ className }: Readonly<{ className?: string }>) {
  return (
    <Badge variant="outline" className={className} title={m.self_reported_hint()}>
      <UserRound data-icon="inline-start" aria-hidden />
      {m.self_reported_badge()}
    </Badge>
  );
}
