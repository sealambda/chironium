import { differenceInDays, format, formatDistanceStrict } from "date-fns";
import { Mail } from "lucide-react";
import { SiWhatsapp, SiInstagram } from "@icons-pack/react-simple-icons";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils";

export interface Customer {
  id: string;
  name: string;
  initials: string;
  status: "up-to-date" | "needs-attention" | "overdue";
  membership: {
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
  // Remove all non-digit characters (spaces, dashes, parentheses, +)
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}`;
}

function getInstagramUrl(instagram: string): string {
  // Remove @ symbol if present
  const username = instagram.startsWith("@") ? instagram.slice(1) : instagram;
  return `https://www.instagram.com/${username}`;
}

interface CustomerCardProps {
  customer: Customer;
}

/**
 * Customer card displaying membership progress, contact actions, and status.
 * Designed following the reference screenshot with dark theme styling.
 */
export function CustomerCard({ customer }: CustomerCardProps) {
  const { email, phone, instagram } = customer.contact;
  const now = new Date();
  const { startDate, endDate } = customer.membership;

  const totalDays = differenceInDays(endDate, startDate);
  const elapsedDays = differenceInDays(now, startDate);
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  const elapsedLabel = formatDistanceStrict(startDate, now, { roundingMethod: "floor" });
  const remainingLabel = formatDistanceStrict(now, endDate, { roundingMethod: "floor" });

  /**
   * Get progress bar color based on percentage.
   * Blue (new) -> Green (stable) -> Orange (ending soon) -> Red (urgent) -> Grey (finished).
   */
  const getProgressColor = (percent: number): string => {
    if (percent >= 100) return "bg-muted-foreground"; // Grey - finished.
    if (percent >= 80) return "bg-red-500"; // Red - urgent, almost done.
    if (percent >= 60) return "bg-orange-500"; // Orange - ending soon.
    if (percent >= 25) return "bg-emerald-500"; // Green - stable.
    return "bg-sky-500"; // Blue - new.
  };

  const progressColor = getProgressColor(progressPercent);

  return (
    <article className="overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
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
            onClick={() => email && window.open(getEmailUrl(email), "_blank")}
            aria-label={`Email ${customer.name}`}
          >
            <Mail className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-emerald-500 disabled:opacity-30"
            disabled={!phone}
            onClick={() => phone && window.open(getWhatsAppUrl(phone), "_blank")}
            aria-label={`WhatsApp ${customer.name}`}
          >
            <SiWhatsapp size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-pink-500 disabled:opacity-30"
            disabled={!instagram}
            onClick={() => instagram && window.open(getInstagramUrl(instagram), "_blank")}
            aria-label={`Instagram ${customer.name}`}
          >
            <SiInstagram size={20} />
          </Button>
        </div>
      </div>

      {/* Progress bar section. */}
      <div className="mt-4">
        <div className="relative">
          {/* Custom progress bar with dynamic color. */}
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-500", progressColor)}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Progress percentage badge - clamped to prevent overflow. */}
          <div
            className="absolute -top-1 flex items-center justify-center"
            style={{ left: `clamp(16px, calc(${progressPercent}% - 20px), calc(100% - 44px))` }}
          >
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-semibold text-white text-xs",
                progressColor,
              )}
            >
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Membership duration info - 3-column grid for proper alignment. */}
        <div className="mt-3 grid grid-cols-3 items-center gap-1 text-xs">
          {/* Left column - elapsed time. */}
          <div className="min-w-0 text-left">
            <div className="font-medium text-muted-foreground">{elapsedLabel} ago</div>
            <div className="truncate text-[10px] text-muted-foreground/70">
              {format(startDate, "MMM d, yy")}
            </div>
          </div>
          {/* Center column - plan duration badge. */}
          <div className="flex justify-center">
            <div className="rounded-md bg-muted px-2 py-0.5 font-medium text-[10px] text-foreground">
              {customer.membership.planDurationMonths}mo plan
            </div>
          </div>
          {/* Right column - time remaining. */}
          <div className="min-w-0 text-right">
            <div className="font-medium text-muted-foreground">{remainingLabel} left</div>
            <div className="truncate text-[10px] text-muted-foreground/70">
              {format(endDate, "MMM d, yy")}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
