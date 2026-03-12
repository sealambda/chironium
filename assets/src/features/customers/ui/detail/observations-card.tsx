import { Link } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronRight, ClipboardList } from "lucide-react";

import {
  type ObservationItem,
  type ObservationsPage,
} from "@/features/customers/api/observations-api";
import { AddObservationDialog } from "@/features/customers/ui/detail/add-observation-dialog";
import * as m from "@/paraglide/messages";
import { CardAddButton } from "@/shared/ui/card-add-button";
import { MarkdownContent } from "@/shared/ui/markdown-content";
import { Skeleton } from "@/shared/ui/skeleton";
import { getDateLocale } from "@/shared/utils/date-locale";

// ─── Props ───────────────────────────────────────────────────────────

interface ObservationsCardProps {
  personId: string;
  patientId: string | null;
  observations: ObservationsPage | null;
  isLoading?: boolean;
}

// ─── Observation row ─────────────────────────────────────────────────

interface ObservationRowProps {
  item: ObservationItem;
}

function ObservationRow({ item }: Readonly<ObservationRowProps>) {
  return (
    <div>
      <MarkdownContent
        content={item.valueString ?? ""}
        className="text-foreground/70 text-xl italic [&_h1]:mt-0 [&_p:first-child]:mt-0 [&_p]:mb-0"
      />
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────

function ObservationsCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="mt-3 divide-y divide-border/60">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={String(i)} className="py-2.5">
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="ml-auto h-3 w-14" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto border-border border-t pt-3">
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function ObservationsCard({
  personId,
  patientId,
  observations,
  isLoading,
}: Readonly<ObservationsCardProps>) {
  if (isLoading) {
    return <ObservationsCardSkeleton />;
  }

  const items = observations?.items ?? [];
  const latestObservation = items[0] ?? null;
  const timeAgo = latestObservation?.effectiveDateTime
    ? formatDistanceToNowStrict(new Date(latestObservation.effectiveDateTime), {
        addSuffix: true,
        locale: getDateLocale(),
      })
    : null;

  if (!latestObservation) {
    return (
      <div className="flex flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-foreground text-xl uppercase tracking-wide">
            {m.observations_last_title()}
          </h3>
          <AddObservationDialog personId={personId} patientId={patientId}>
            <CardAddButton label={m.observations_add()} />
          </AddObservationDialog>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
          <ClipboardList className="size-10 text-muted-foreground/60" />
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">{m.observations_empty()}</p>
            <p className="mt-0.5 text-foreground/65 text-xs">{m.observations_empty_desc()}</p>
          </div>
        </div>
        <div className="mt-auto border-border border-t pt-3" style={{ marginTop: "1rem" }}>
          <Link
            to="/customers/$customerId/observations"
            params={{ customerId: personId }}
            className="flex items-center gap-1.5 text-foreground/70 text-sm transition-colors hover:text-foreground"
          >
            <span>{m.observations_view_all()}</span>
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-end gap-1 sm:gap-2">
          <p className="font-bold text-foreground text-xl uppercase tracking-wide leading-none">
            {m.observations_last_title()}
          </p>
          {timeAgo ? (
            <span className="shrink-0 text-foreground/50 text-sm leading-none">{timeAgo}</span>
          ) : null}
        </div>
        <AddObservationDialog personId={personId} patientId={patientId}>
          <CardAddButton label={m.observations_add()} />
        </AddObservationDialog>
      </div>

      <div className="mt-3">
        <ObservationRow item={latestObservation} />
      </div>

      <div className="mt-auto border-border border-t pt-3" style={{ marginTop: "1rem" }}>
        <Link
          to="/customers/$customerId/observations"
          params={{ customerId: personId }}
          className="flex items-center gap-1.5 text-foreground/70 text-sm transition-colors hover:text-foreground"
        >
          <span>{m.observations_view_all()}</span>
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
