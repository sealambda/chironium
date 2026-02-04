import { SiInstagram, SiWhatsapp } from "@icons-pack/react-simple-icons";
import { Mail } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";
import { cn } from "@/shared/utils";

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

function getEmailUrl(email: string): string {
  return `mailto:${encodeURIComponent(email)}`;
}

function getWhatsAppUrl(phone: string): string {
  // Remove all non-digit characters (spaces, dashes, parentheses, +).
  const cleanPhone = phone.replaceAll(/\D/g, "");
  return `https://wa.me/${cleanPhone}`;
}

function getInstagramUrl(instagram: string): string {
  // Remove @ symbol if present.
  const username = instagram.startsWith("@") ? instagram.slice(1) : instagram;
  return `https://www.instagram.com/${username}`;
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
export function CustomerCard({
  customer,
  onClick,
}: Readonly<CustomerCardProps>) {
  const { email, phone, instagram } = customer.contact;

  const content = (
    <>
      {/* Header: Name and contact actions. */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate font-semibold text-foreground">
          {customer.name}
        </h3>

        {/* Contact action buttons - 44px touch targets per Apple HIG. */}
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground disabled:opacity-30"
            disabled={!email}
            onClick={(e) => {
              e.stopPropagation();
              email && window.open(getEmailUrl(email), "_blank");
            }}
            aria-label={`Email ${customer.name}`}
          >
            <Mail className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-emerald-500 disabled:opacity-30"
            disabled={!phone}
            onClick={(e) => {
              e.stopPropagation();
              phone && window.open(getWhatsAppUrl(phone), "_blank");
            }}
            aria-label={`WhatsApp ${customer.name}`}
          >
            <SiWhatsapp size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-pink-500 disabled:opacity-30"
            disabled={!instagram}
            onClick={(e) => {
              e.stopPropagation();
              instagram && window.open(getInstagramUrl(instagram), "_blank");
            }}
            aria-label={`Instagram ${customer.name}`}
          >
            <SiInstagram size={20} />
          </Button>
        </div>
      </div>

      {/* Subscription progress section. */}
      <SubscriptionProgress
        subscription={customer.subscription}
        className="mt-4"
      />
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
