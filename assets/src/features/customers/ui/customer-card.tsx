import { SiInstagram, SiWhatsapp } from "@icons-pack/react-simple-icons";
import { format, formatDistanceStrict } from "date-fns";
import { Mail } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils";
import type { Customer } from "../model/customer-types";
import {
  getEmailUrl,
  getInstagramUrl,
  getWhatsAppUrl,
} from "../utils/contact-utils";
import {
  calculateProgressPercent,
  getProgressColor,
} from "../utils/progress-utils";

interface CustomerCardProps {
  customer: Customer;
  /** Called when the card is clicked (for editing) */
  onClick?: () => void;
}

/**
 * Customer card for mobile view (< 768px).
 *
 * Redesigned with:
 * - StatusAvatar with colored ring indicating status
 * - Compact icon buttons for contact actions aligned with name
 * - Progress bar with dates
 *
 * Follows design system best practices:
 * - Material Design 3: Card layouts for mobile
 * - Apple HIG: Touch targets and progressive disclosure
 * - Accessible with proper ARIA labels
 */
export function CustomerCard({
  customer,
  onClick,
}: Readonly<CustomerCardProps>) {
  const { email, phone, instagram } = customer.contact;
  const now = new Date();
  const { startDate, endDate } = customer.subscription;

  const progressPercent = calculateProgressPercent(customer);

  const elapsedLabel = formatDistanceStrict(startDate, now, {
    roundingMethod: "floor",
    addSuffix: true,
  });
  const remainingLabel = formatDistanceStrict(endDate, now, {
    roundingMethod: "floor",
    addSuffix: true,
  });

  const progressColor = getProgressColor(progressPercent);

  const content = (
    <div className="space-y-4">
      {/* Header: StatusAvatar + Name + Contact Icon Buttons */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <StatusAvatar customer={customer} size="md" />
          <h3 className="truncate font-semibold text-foreground text-base">
            {customer.name}
          </h3>
        </div>

        {/* Contact icon buttons */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
            disabled={!email}
            onClick={(e) => {
              e.stopPropagation();
              email &&
                window.open(`mailto:${encodeURIComponent(email)}`, "_blank");
            }}
            aria-label={`Email ${customer.name}`}
          >
            <Mail className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-emerald-500 disabled:opacity-30"
            disabled={!phone}
            onClick={(e) => {
              e.stopPropagation();
              const cleanPhone = phone?.replaceAll(/\D/g, "");
              cleanPhone &&
                window.open(`https://wa.me/${cleanPhone}`, "_blank");
            }}
            aria-label={`WhatsApp ${customer.name}`}
          >
            <SiWhatsapp size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-pink-500 disabled:opacity-30"
            disabled={!instagram}
            onClick={(e) => {
              e.stopPropagation();
              const username = instagram?.startsWith("@")
                ? instagram.slice(1)
                : instagram;
              username &&
                window.open(`https://www.instagram.com/${username}`, "_blank");
            }}
            aria-label={`Instagram ${customer.name}`}
          >
            <SiInstagram size={16} />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <CustomerProgressBar customer={customer} variant="full" />
    </div>
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
