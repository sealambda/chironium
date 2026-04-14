import type { CustomerListItem } from "@/features/customers/api/persons-api";
import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { formatPersonName } from "@/shared/utils/person-utils";
import { cn } from "@/shared/utils/utils";

interface PersonCardProps {
  item: CustomerListItem;
  className?: string;
}

/**
 * Person card displaying contact actions and, when a subscription exists, its progress.
 */
export function PersonCard({ item, className }: Readonly<PersonCardProps>) {
  const { person, subscription } = item;
  const name = formatPersonName(person.name);
  const contact = extractContactInfo(person.telecom);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col items-start gap-3">
        <h3 className="min-w-0 truncate font-semibold text-foreground sm:flex-1">{name}</h3>

        <ContactButtonGroup {...contact} personName={name} stopPropagation />
      </div>

      <SubscriptionProgress subscription={subscription} className="mt-4" />
    </article>
  );
}
