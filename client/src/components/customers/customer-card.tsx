import { CheckCircle2, Mail, Phone, MessageCircle } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Customer {
  id: string;
  name: string;
  avatarUrl?: string;
  initials: string;
  status: 'up-to-date' | 'needs-attention' | 'overdue';
  membership: {
    startDate: Date;
    planDurationMonths: number;
    endDate: Date;
  };
  lastReview: {
    date: Date;
    label: string;
  };
  reports: {
    frequency: 'Weekly' | 'Bi-weekly' | 'Monthly';
    nextDate: Date;
    nextLabel: string;
  };
}

interface CustomerCardProps {
  customer: Customer;
  onEmailClick?: () => void;
  onWhatsAppClick?: () => void;
  onCallClick?: () => void;
}

/**
 * Customer card displaying membership progress, contact actions, and status.
 * Designed following the reference screenshot with dark theme styling.
 */
export function CustomerCard({
  customer,
  onEmailClick,
  onWhatsAppClick,
  onCallClick,
}: CustomerCardProps) {
  const now = new Date();
  const totalDays =
    (customer.membership.endDate.getTime() - customer.membership.startDate.getTime()) /
    (1000 * 60 * 60 * 24);
  const elapsedDays =
    (now.getTime() - customer.membership.startDate.getTime()) / (1000 * 60 * 60 * 24);
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  const monthsElapsed = Math.floor(elapsedDays / 30);
  const monthsLeft = customer.membership.planDurationMonths - monthsElapsed;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  };

  const getRelativeTime = (date: Date) => {
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    const months = Math.floor(diffDays / 30);
    return `${months}mo ago`;
  };

  const getFutureRelativeTime = (date: Date) => {
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  /**
   * Get progress bar color based on percentage.
   * Blue (new) -> Green (stable) -> Orange (ending soon) -> Red (urgent) -> Grey (finished).
   */
  const getProgressColor = (percent: number): string => {
    if (percent >= 100) return 'bg-muted-foreground'; // Grey - finished.
    if (percent >= 80) return 'bg-red-500'; // Red - urgent, almost done.
    if (percent >= 60) return 'bg-orange-500'; // Orange - ending soon.
    if (percent >= 25) return 'bg-emerald-500'; // Green - stable.
    return 'bg-sky-500'; // Blue - new.
  };

  const progressColor = getProgressColor(progressPercent);

  const statusConfig = {
    'up-to-date': {
      icon: CheckCircle2,
      label: 'Up to Date',
      className: 'text-emerald-500',
      ringClassName: 'ring-emerald-500/40',
      ballClassName: 'bg-emerald-500',
    },
    'needs-attention': {
      icon: CheckCircle2,
      label: 'Needs Attention',
      className: 'text-amber-500',
      ringClassName: 'ring-amber-500/40',
      ballClassName: 'bg-amber-500',
    },
    overdue: {
      icon: CheckCircle2,
      label: 'Overdue',
      className: 'text-destructive',
      ringClassName: 'ring-destructive/40',
      ballClassName: 'bg-destructive',
    },
  };

  const status = statusConfig[customer.status];
  const StatusIcon = status.icon;

  return (
    <article className="rounded-2xl bg-card p-4 shadow-sm border border-border/50 overflow-hidden">
      {/* Header: Avatar, name, status, and contact actions. */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar with status ring. */}
          <div className="relative shrink-0">
            <Avatar
              className={cn(
                'h-12 w-12 ring-[3px] ring-offset-2 ring-offset-card',
                status.ringClassName
              )}
            >
              <AvatarImage src={customer.avatarUrl} alt={customer.name} />
              <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                {customer.initials}
              </AvatarFallback>
            </Avatar>
            {/* Status indicator dot - matches avatar ring color. */}
            <div
              className={cn(
                'absolute bottom-0 left-0 h-3 w-3 rounded-full ring-2 ring-card',
                status.ballClassName
              )}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{customer.name}</h3>
            <div className={cn('flex items-center gap-1 text-sm', status.className)}>
              <StatusIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{status.label}</span>
            </div>
          </div>
        </div>

        {/* Contact action buttons - 44px touch targets per Apple HIG. */}
        <div className="flex items-center shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
            onClick={onEmailClick}
            aria-label={`Email ${customer.name}`}
          >
            <Mail className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-emerald-500"
            onClick={onWhatsAppClick}
            aria-label={`WhatsApp ${customer.name}`}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
            onClick={onCallClick}
            aria-label={`Call ${customer.name}`}
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress bar section. */}
      <div className="mt-4">
        <div className="relative">
          {/* Custom progress bar with dynamic color. */}
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all duration-500', progressColor)}
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
                'rounded-full px-2 py-0.5 text-xs font-semibold text-white',
                progressColor
              )}
            >
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Membership duration info - 3-column grid for proper alignment. */}
        <div className="mt-3 grid grid-cols-3 items-center gap-1 text-xs">
          {/* Left column - elapsed time. */}
          <div className="text-left min-w-0">
            <div className="font-medium text-muted-foreground">{monthsElapsed}mo ago</div>
            <div className="text-[10px] text-muted-foreground/70 truncate">
              {formatDate(customer.membership.startDate)}
            </div>
          </div>
          {/* Center column - plan duration badge. */}
          <div className="flex justify-center">
            <div className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
              {customer.membership.planDurationMonths}mo plan
            </div>
          </div>
          {/* Right column - time remaining. */}
          <div className="text-right min-w-0">
            <div className="font-medium text-muted-foreground">{monthsLeft}mo left</div>
            <div className="text-[10px] text-muted-foreground/70 truncate">
              {formatDate(customer.membership.endDate)}
            </div>
          </div>
        </div>
      </div>

      {/* Review and report schedule. */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/50 pt-4">
        <div className="min-w-0">
          <div className="text-[10px] text-muted-foreground">Last Review</div>
          <div className="text-sm font-semibold text-foreground">
            {customer.lastReview.date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {getRelativeTime(customer.lastReview.date)}
          </div>
        </div>

        <div className="text-center min-w-0">
          <div className="text-[10px] text-muted-foreground">Reports</div>
          <div className="text-sm font-semibold text-foreground">{customer.reports.frequency}</div>
        </div>

        <div className="text-right min-w-0">
          <div className="text-[10px] text-muted-foreground">Next Report</div>
          <div className="text-sm font-semibold text-amber-500">
            {customer.reports.nextDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {getFutureRelativeTime(customer.reports.nextDate)}
          </div>
        </div>
      </div>
    </article>
  );
}
