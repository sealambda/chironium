import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";
import { cn } from "@/shared/utils/utils";

export interface Customer {
  id: string;
  name: string;
  initials: string;
  status: "up-to-date" | "needs-attention" | "overdue";
  subscription: {
    startDate: Date;
    planDurationMonths: number;
    endDate: Date;
  };
  contact: {
    email?: string;
    phone?: string;
    instagram?: string;
  };
}

interface CustomerCardProps {
  customer: Customer;
  /** Called when the card is clicked (for editing) */
  onClick?: () => void;
}

/**
 * Customer card displaying subscription progress, contact actions, and status.
 * Designed following the reference screenshot with dark theme styling.
 */
export function CustomerCard({ customer, onClick }: Readonly<CustomerCardProps>) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate font-semibold text-foreground">{customer.name}</h3>

        <ContactButtonGroup {...customer.contact} customerName={customer.name} stopPropagation />
      </div>

      <SubscriptionProgress subscription={customer.subscription} className="mt-4" />
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={cn(
          "w-full overflow-hidden rounded-2xl border border-border/50 bg-card p-4 text-left shadow-sm",
          "cursor-pointer transition-colors hover:bg-accent/50",
        )}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      {content}
    </article>
  );
}
