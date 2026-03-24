import { addMonths, formatISO } from "date-fns";

import type { CustomerListItem } from "@/features/customers/api/persons-api";
import * as m from "@/paraglide/messages";
import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { formatPersonName } from "@/shared/utils/person-utils";
import { durationToMonths } from "@/shared/utils/subscriptions-utils";

interface PersonCardProps {
  item: CustomerListItem;
}

/**
 * Person card displaying contact actions and, when a subscription exists, its progress.
 */
export function PersonCard({ item }: Readonly<PersonCardProps>) {
  const { person, subscription } = item;
  const name = formatPersonName(person.name);
  const contact = extractContactInfo(person.telecom);

  const planDurationMonths = subscription ? durationToMonths(subscription.plan?.duration) : null;
  const endDate =
    subscription && planDurationMonths
      ? formatISO(addMonths(new Date(subscription.startDate), planDurationMonths), {
          representation: "date",
        })
      : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate font-semibold text-foreground">{name}</h3>

        <ContactButtonGroup {...contact} personName={name} stopPropagation />
      </div>

      {subscription && endDate && planDurationMonths ? (
        <SubscriptionProgress
          startDate={subscription.startDate}
          endDate={endDate}
          planDurationMonths={planDurationMonths}
          className="mt-4"
        />
      ) : (
        <p className="mt-3 text-muted-foreground text-xs">{m.customer_no_subscription()}</p>
      )}
    </article>
  );
}
