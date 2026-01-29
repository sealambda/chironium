import { Mail } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

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

/**
 * Format a duration in days to a human-readable string.
 * - Less than 7 days: "X days" (or "1 day")
 * - 7 to 29 days: "X weeks" (or "1 week")
 * - 30+ days: "Xmo"
 */
function formatDuration(days: number): string {
  if (days < 1) {
    return "Today";
  }

  const roundedDays = Math.round(days);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (days < 7) {
    return roundedDays === 1 ? "1 day" : `${roundedDays} days`;
  }
  if (days < 30) {
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  return `${months}mo`;
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
  const totalDays =
    (customer.membership.endDate.getTime() - customer.membership.startDate.getTime()) /
    (1000 * 60 * 60 * 24);
  const elapsedDays =
    (now.getTime() - customer.membership.startDate.getTime()) / (1000 * 60 * 60 * 24);
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  const daysRemaining = Math.max(
    0,
    (customer.membership.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  const elapsedLabel = formatDuration(elapsedDays);
  const remainingLabel = formatDuration(daysRemaining);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    });
  };

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
            <WhatsAppIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-pink-500 disabled:opacity-30"
            disabled={!instagram}
            onClick={() => instagram && window.open(getInstagramUrl(instagram), "_blank")}
            aria-label={`Instagram ${customer.name}`}
          >
            <InstagramIcon className="h-5 w-5" />
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
              {formatDate(customer.membership.startDate)}
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
              {formatDate(customer.membership.endDate)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
