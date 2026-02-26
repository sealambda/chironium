// biome-ignore-all lint/style/useNamingConvention: keys match GraphQL enum values
import { Link } from "@tanstack/react-router";
import { ChevronRight, PlusIcon, Target } from "lucide-react";

import type { GoalRecord } from "@/features/customers/api/goals-api";
import { AddGoalDialog } from "@/features/customers/ui/detail/add-goal-dialog";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

// ─── Props ───────────────────────────────────────────────────────────

interface GoalsCardProps {
  personId: string;
  patientId: string | null;
  goals: GoalRecord[];
  isLoading?: boolean;
}

// ─── Achievement status badge ────────────────────────────────────────

const ACHIEVEMENT_STYLES: Record<string, string> = {
  IMPROVING: "border-emerald-200 bg-emerald-100 text-emerald-800",
  ACHIEVED: "border-emerald-200 bg-emerald-100 text-emerald-800",
  SUSTAINING: "border-sky-200 bg-sky-100 text-sky-800",
  IN_PROGRESS: "border-blue-200 bg-blue-100 text-blue-800",
  NO_CHANGE: "border-neutral-200 bg-neutral-100 text-neutral-700",
  NO_PROGRESS: "border-neutral-200 bg-neutral-100 text-neutral-700",
  WORSENING: "border-red-200 bg-red-100 text-red-800",
  NOT_ACHIEVED: "border-red-200 bg-red-100 text-red-800",
  NOT_ATTAINABLE: "border-red-200 bg-red-100 text-red-800",
};

const ACHIEVEMENT_LABELS: Record<string, () => string> = {
  IMPROVING: m.goals_status_improving,
  ACHIEVED: m.goals_status_achieved,
  SUSTAINING: m.goals_status_sustaining,
  IN_PROGRESS: m.goals_status_in_progress,
  NO_CHANGE: m.goals_status_no_change,
  NO_PROGRESS: m.goals_status_no_progress,
  WORSENING: m.goals_status_worsening,
  NOT_ACHIEVED: m.goals_status_not_achieved,
  NOT_ATTAINABLE: m.goals_status_not_attainable,
};

function AchievementBadge({ status }: Readonly<{ status: string }>) {
  const style = ACHIEVEMENT_STYLES[status] ?? ACHIEVEMENT_STYLES.NO_CHANGE;
  const label = ACHIEVEMENT_LABELS[status]?.() ?? status;

  return <Badge className={`h-5 shrink-0 px-1.5 font-semibold text-xs ${style}`}>{label}</Badge>;
}

// ─── Loading skeleton ────────────────────────────────────────────────

function GoalsCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
      <div className="min-h-19 space-y-1.5">
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-9 w-10" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-3.5 w-12" />
      </div>
      <div className="my-4 h-px bg-neutral-200" />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={String(i)} className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <div className="mt-auto border-neutral-200 border-t pt-3" style={{ marginTop: "1rem" }}>
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function GoalsCard({ personId, patientId, goals, isLoading }: Readonly<GoalsCardProps>) {
  if (isLoading) {
    return <GoalsCardSkeleton />;
  }

  if (goals.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
        <div className="flex items-start justify-end">
          <AddGoalDialog personId={personId} patientId={patientId}>
            <Button variant="outline" size="sm">
              <PlusIcon className="size-4" data-icon="inline-start" />
              {m.goals_add()}
            </Button>
          </AddGoalDialog>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6">
          <Target className="size-8 text-neutral-400" />
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">{m.goals_no_goals()}</p>
            <p className="text-foreground/65 text-xs">{m.goals_no_goals_desc()}</p>
          </div>
        </div>
        <div className="mt-auto border-neutral-200 border-t pt-3">
          <Link
            to="/customers/$customerId/goals"
            params={{ customerId: personId }}
            className="flex items-center gap-1.5 text-foreground/70 text-sm transition-colors hover:text-foreground"
          >
            <span>{m.goals_view_all()}</span>
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-h-19 space-y-0.5">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-3xl text-foreground tabular-nums">{goals.length}</span>
            <span className="text-foreground/65 text-sm">{m.goals_title()}</span>
          </div>
          <div className="text-foreground/65 text-xs">{m.goals_active()}</div>
        </div>
        <AddGoalDialog personId={personId} patientId={patientId}>
          <Button variant="outline" size="sm">
            <PlusIcon className="size-4" data-icon="inline-start" />
            {m.goals_add()}
          </Button>
        </AddGoalDialog>
      </div>

      <div className="my-4 h-px bg-neutral-200" />

      <div className="space-y-3">
        {goals.map((goal) => (
          <div key={goal.id} className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-foreground/80 text-sm">
              <span className="text-foreground/40">·</span> {goal.description.text}
            </p>
            {goal.achievementStatus ? <AchievementBadge status={goal.achievementStatus} /> : null}
          </div>
        ))}
      </div>

      <div className="mt-auto border-neutral-200 border-t pt-3" style={{ marginTop: "1rem" }}>
        <Link
          to="/customers/$customerId/goals"
          params={{ customerId: personId }}
          className="flex items-center gap-1.5 text-foreground/70 text-sm transition-colors hover:text-foreground"
        >
          <span>{m.goals_view_all()}</span>
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
