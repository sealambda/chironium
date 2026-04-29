import { format, parseISO } from "date-fns";

import type { GoalRecord } from "@/features/customers/api/goals-api";
import { AchievementBadge } from "@/features/customers/ui/shared/achievement-badge";
import * as m from "@/paraglide/messages";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { getDateLocale } from "@/shared/utils/date-locale";

interface GoalEventProps {
  goals: GoalRecord[];
  variant: "created" | "due";
}

const CATEGORY_LABELS = new Map<string, () => string>([
  ["DIETARY", m.activity_goal_category_dietary],
  ["SAFETY", m.activity_goal_category_safety],
  ["BEHAVIORAL", m.activity_goal_category_behavioral],
  ["NURSING", m.activity_goal_category_nursing],
  ["PHYSIOTHERAPY", m.activity_goal_category_physiotherapy],
]);

function formatGoalDate(dateStr: string | null | undefined): string | null {
  return dateStr ? format(parseISO(dateStr), "MMM d, yyyy", { locale: getDateLocale() }) : null;
}

function SingleGoal({ goal, variant }: Readonly<{ goal: GoalRecord; variant: "created" | "due" }>) {
  const description = goal.description?.text ?? "";
  const dateStr = variant === "due" ? goal.dueDate : goal.startDate;
  const formattedDate = formatGoalDate(dateStr);

  return (
    <div className="space-y-1.5">
      {description ? <p className="text-foreground/80 text-sm">{description}</p> : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {goal.achievementStatus && variant === "due" ? (
          <AchievementBadge status={goal.achievementStatus} />
        ) : null}
        {goal.category?.[0] && CATEGORY_LABELS.get(goal.category[0]) ? (
          <span className="text-muted-foreground text-xs">
            {CATEGORY_LABELS.get(goal.category[0])?.()}
          </span>
        ) : null}
        {formattedDate ? (
          <time dateTime={dateStr ?? undefined} className="text-muted-foreground text-xs">
            {formattedDate}
          </time>
        ) : null}
      </div>
    </div>
  );
}

function GoalTable({ goals }: Readonly<{ goals: GoalRecord[] }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-7 py-1 text-xs">{m.activity_goal_column_description()}</TableHead>
          <TableHead className="h-7 py-1 text-xs">{m.activity_goal_column_category()}</TableHead>
          <TableHead className="h-7 py-1 text-xs">{m.activity_goal_column_target()}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {goals.map((goal) => (
          <TableRow key={goal.id}>
            <TableCell className="py-1 text-justify text-xs">
              {goal.description?.text ?? "—"}
            </TableCell>
            <TableCell className="py-1 text-xs">
              {goal.category?.[0] && CATEGORY_LABELS.get(goal.category[0])
                ? CATEGORY_LABELS.get(goal.category[0])?.()
                : "—"}
            </TableCell>
            <TableCell className="py-1 text-xs">{formatGoalDate(goal.dueDate) ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function GoalEvent({ goals, variant }: Readonly<GoalEventProps>) {
  const first = goals[0];
  if (variant === "due") {
    return first ? <SingleGoal goal={first} variant="due" /> : null;
  }
  if (goals.length === 1 && first) {
    return <SingleGoal goal={first} variant="created" />;
  }
  return <GoalTable goals={goals} />;
}
