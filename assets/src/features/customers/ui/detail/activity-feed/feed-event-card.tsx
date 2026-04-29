import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { FeedActor, FeedEventAccent } from "@/features/customers/types/activity-feed";
import { accentDotBgClass, accentIconClass } from "@/features/customers/types/activity-feed";
import * as m from "@/paraglide/messages";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { getDateLocale } from "@/shared/utils/date-locale";
import { getInitials } from "@/shared/utils/name-utils";
import { cn } from "@/shared/utils/utils";

interface FeedEventCardProps {
  accent: FeedEventAccent;
  icon: LucideIcon;
  /** Short label shown in the type pill beside the verb (e.g. "Anthropometry"). */
  label: string;
  /** Verb phrase placed between the actor name and the type pill (e.g. "logged new"). */
  verb: string;
  /** Optional inline content rendered after the type pill (e.g. a subscription plan name). */
  suffix?: ReactNode;
  /** Optional trailing slot rendered at the end of the headline row (e.g. an edit button). */
  action?: ReactNode;
  actor?: FeedActor;
  /** ISO date string used for relative and absolute display. */
  date: string;
  /** Reduces opacity for future/upcoming events. */
  isFuture?: boolean;
  children: ReactNode;
}

export function FeedEventCard({
  accent,
  icon: Icon,
  label,
  verb,
  suffix,
  action,
  actor,
  date,
  isFuture = false,
  children,
}: Readonly<FeedEventCardProps>) {
  const locale = getDateLocale();
  const relative = formatDistanceToNowStrict(parseISO(date), { addSuffix: true, locale });
  const absolute = format(parseISO(date), "PP", { locale });

  return (
    <article
      className={cn("group flex gap-3 pb-6 last:pb-0", isFuture && "opacity-75")}
      aria-label={label}
    >
      <div className="flex flex-col items-center">
        {actor != null ? (
          <Avatar size="sm" className="shrink-0">
            <AvatarFallback>{getInitials(actor.name)}</AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full",
              accentDotBgClass[accent],
            )}
          >
            <Icon className={cn("size-3 shrink-0", accentIconClass[accent])} aria-hidden />
          </div>
        )}
        <div className="mt-2 w-px flex-1 bg-muted-foreground/80 group-last:hidden" />
      </div>

      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-snug">
          {actor != null && (
            <span className="font-semibold text-foreground text-sm">{actor.name}</span>
          )}
          {actor != null && <span className="text-muted-foreground text-sm">{verb}</span>}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs capitalize",
              accentDotBgClass[accent],
              accentIconClass[accent],
            )}
          >
            <Icon className="size-3 shrink-0" aria-hidden />
            {label}
          </span>
          {suffix != null ? (
            <span className="font-medium text-foreground text-sm">{suffix}</span>
          ) : null}
          {action != null ? <span className="shrink-0">{action}</span> : null}
        </div>
        <time dateTime={date} className="mt-0.5 block text-muted-foreground text-xs">
          {relative} · {absolute}
          {actor?.noteAuthorName ? (
            <>
              {" · "}
              {m.activity_noted_by({ name: actor.noteAuthorName })}
            </>
          ) : null}
        </time>
        <div className="mt-3">{children}</div>
      </div>
    </article>
  );
}
