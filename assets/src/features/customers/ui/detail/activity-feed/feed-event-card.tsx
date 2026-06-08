import { format, parseISO } from "date-fns";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { FeedActor, FeedEventAccent } from "@/features/customers/types/activity-feed";
import { accentDotBgClass, accentIconClass } from "@/features/customers/types/activity-feed";
import { formatDayLabelFromIso } from "@/features/customers/utils/activity-feed-dates";
import * as m from "@/paraglide/messages";
import { Avatar, AvatarFallback, AvatarGroup } from "@/shared/ui/avatar";
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
  /** Optional trailing slot rendered at the end of the headline row (e.g. an edit button). */
  action?: ReactNode;
  /** Multiple actors (e.g., different people who logged measurements). */
  actors?: FeedActor[];
  /** ISO date string used for relative and absolute display. */
  date: string;
  /** Optional badge rendered inline after the date (e.g. a status badge). */
  dateBadge?: ReactNode;
  /** Reduces opacity for future/upcoming events. */
  isFuture?: boolean;
  children: ReactNode;
}

export function FeedEventCard({
  accent,
  icon: Icon,
  label,
  verb,
  action,
  actors,
  date,
  dateBadge,
  isFuture = false,
  children,
}: Readonly<FeedEventCardProps>) {
  const locale = getDateLocale();
  const relative = formatDayLabelFromIso(date);
  const absolute = format(parseISO(date), "PP", { locale });

  const primaryActor = actors?.[0];
  const showAvatarGroup = (actors?.length ?? 0) > 1;
  let actorVisual: ReactNode;
  if (showAvatarGroup) {
    actorVisual = (
      <AvatarGroup className="shrink-0">
        {(actors ?? []).map((a) => (
          <Avatar key={a.id || a.name} size="sm" className="border-2 border-background">
            <AvatarFallback>{getInitials(a.name)}</AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
    );
  } else if (primaryActor) {
    actorVisual = (
      <Avatar size="sm" className="shrink-0">
        <AvatarFallback>{getInitials(primaryActor.name)}</AvatarFallback>
      </Avatar>
    );
  } else {
    actorVisual = (
      <div
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full ring-1 ring-border",
          accentDotBgClass[accent],
        )}
      >
        <Icon className={cn("size-3 shrink-0", accentIconClass[accent])} aria-hidden />
      </div>
    );
  }

  return (
    <article
      className={cn("group flex gap-3 pb-6 last:pb-0", isFuture && "opacity-75")}
      aria-label={label}
    >
      <div className="flex flex-col items-center">
        <div className="flex min-h-8 items-center">{actorVisual}</div>
        <div className="mt-1.5 w-px flex-1 bg-muted-foreground/80 group-last:hidden" />
      </div>

      <div className="min-w-0 flex-1 pb-1">
        <div className="flex min-h-8 flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-snug">
          {primaryActor != null && (
            <span className="font-semibold text-foreground text-sm">{primaryActor.name}</span>
          )}
          <span className="text-muted-foreground text-sm">{verb}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs",
              accentDotBgClass[accent],
              accentIconClass[accent],
            )}
          >
            <Icon className="size-3 shrink-0" aria-hidden />
            {label}
          </span>
          {action ? <span className="shrink-0">{action}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <time dateTime={date} className="block text-muted-foreground text-xs">
            {relative} · {absolute}
            {primaryActor?.noteAuthorName ? (
              <>
                {" · "}
                {m.activity_noted_by({ name: primaryActor.noteAuthorName })}
              </>
            ) : null}
          </time>
          {dateBadge}
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </article>
  );
}
