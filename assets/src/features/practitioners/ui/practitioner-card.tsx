import type { Practitioner } from "@/features/practitioners/api/practitioners-api";
import { formatPractitionerBirthDate } from "@/features/practitioners/lib/format-practitioner-date";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { formatPersonName } from "@/shared/utils/person-utils";

interface PractitionerCardProps {
  readonly practitioner: Practitioner;
}

function statusBadge(practitioner: Practitioner) {
  if (practitioner.active === true) {
    return (
      <Badge variant="secondary" className="shrink-0">
        {m.practitioners_status_active()}
      </Badge>
    );
  }
  if (practitioner.active === false) {
    return (
      <Badge variant="outline" className="shrink-0">
        {m.practitioners_status_inactive()}
      </Badge>
    );
  }
  return (
    <Badge variant="ghost" className="shrink-0 text-muted-foreground">
      {m.practitioners_status_unknown()}
    </Badge>
  );
}

/**
 * Summary card for a practitioner in mobile list layouts.
 */
export function PractitionerCard({ practitioner }: PractitionerCardProps) {
  const name = formatPersonName(practitioner.name);

  return (
    <article className="overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 font-semibold text-foreground">{name}</h3>
        {statusBadge(practitioner)}
      </div>
      <p className="mt-2 text-muted-foreground text-sm">
        {m.practitioners_col_birth_date()}: {formatPractitionerBirthDate(practitioner.birthDate)}
      </p>
    </article>
  );
}
