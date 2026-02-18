import { addMonths, formatISO } from "date-fns";

import type { SubscriptionWithPerson } from "@/features/customers/api/subscriptions-api";
import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { durationToMonths } from "@/shared/utils/duration-utils";
import { formatPersonName } from "@/shared/utils/person-utils";

interface PersonCardProps {
  item: SubscriptionWithPerson;
}

/**
 * Person card displaying subscription progress, contact actions, and status.
 */
export function PersonCard({ item }: Readonly<PersonCardProps>) {
  const name = formatPersonName(item.subscriber.name);
  const contact = extractContactInfo(item.subscriber.telecom);
  const planDurationMonths = durationToMonths(item.plan.duration);
  const endDate = formatISO(addMonths(new Date(item.startDate), planDurationMonths), {
    representation: "date",
  });

  return (
    <article className="overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate font-semibold text-foreground">{name}</h3>

        <ContactButtonGroup {...contact} personName={name} stopPropagation />
      </div>

      <SubscriptionProgress
        startDate={item.startDate}
        endDate={endDate}
        planDurationMonths={planDurationMonths}
        className="mt-4"
      />
    </article>
  );
}
