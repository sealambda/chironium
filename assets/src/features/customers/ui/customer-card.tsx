import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";

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
}

/**
 * Customer card displaying subscription progress, contact actions, and status.
 */
export function CustomerCard({ customer }: Readonly<CustomerCardProps>) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate font-semibold text-foreground">{customer.name}</h3>

        <ContactButtonGroup {...customer.contact} customerName={customer.name} stopPropagation />
      </div>

      <SubscriptionProgress subscription={customer.subscription} className="mt-4" />
    </article>
  );
}
