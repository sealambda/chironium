import { Link } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronRight, ClipboardList, PlusIcon } from "lucide-react";

import {
  getObservationDisplayValue,
  type ObservationItem,
  type ObservationsPage,
} from "@/features/customers/api/observations-api";
import { AddObservationDialog } from "@/features/customers/ui/detail/add-observation-dialog";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
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
  const title = getObservationDisplayValue(item);
  const timeAgo = item.effectiveDateTime
    ? formatDistanceToNowStrict(new Date(item.effectiveDateTime), {
        addSuffix: true,
        locale: getDateLocale(),
      })
    : null;

  return (
    <div className="group py-2.5">
      <div className="flex items-baseline gap-2">
        <span className="truncate font-medium text-foreground text-sm">{title}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {timeAgo ? <span className="text-foreground/50 text-xs">{timeAgo}</span> : null}
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────

function ObservationsCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="mt-3 divide-y divide-neutral-200/60">
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
      <div className="mt-auto border-neutral-200 border-t pt-3">
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
  const totalCount = observations?.count ?? 0;

  if (items.length === 0) {
    return (
      <div className="flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-foreground text-xl uppercase tracking-wide">
            {m.observations_title()}
          </h3>
          <AddObservationDialog personId={personId} patientId={patientId}>
            <Button variant="outline" size="sm">
              <PlusIcon className="size-4" data-icon="inline-start" />
              {m.observations_add()}
            </Button>
          </AddObservationDialog>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
          <ClipboardList className="size-10 text-neutral-300" />
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">{m.observations_empty()}</p>
            <p className="mt-0.5 text-foreground/65 text-xs">{m.observations_empty_desc()}</p>
          </div>
        </div>
        <div className="mt-auto border-neutral-200 border-t pt-3">
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
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground text-xl uppercase tracking-wide">
          {m.observations_title()}
          {totalCount > 0 ? (
            <span className="ml-1.5 font-normal text-foreground/50 text-sm">({totalCount})</span>
          ) : null}
        </h3>
        <AddObservationDialog personId={personId} patientId={patientId}>
          <Button variant="outline" size="sm">
            <PlusIcon className="size-4" data-icon="inline-start" />
            {m.observations_add()}
          </Button>
        </AddObservationDialog>
      </div>

      <div className="mt-1 divide-y divide-neutral-200/60">
        {items.map((item) => (
          <ObservationRow key={item.id} item={item} />
        ))}
      </div>

      <div className="mt-auto border-neutral-200 border-t pt-3">
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
