import { format, parseISO } from "date-fns";

import type { GoalRecord } from "@/features/customers/api/goals-api";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { getDateLocale } from "@/shared/utils/date-locale";

interface GoalEventProps {
  goals: GoalRecord[];
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

function formatGoalDateRange(startDate: string | null, endDate: string | null): string | null {
  if (startDate && endDate) {
    return `${startDate} – ${endDate}`;
  }
  if (endDate) {
    return `– ${endDate}`;
  }
  return startDate;
}

function SingleGoal({ goal }: Readonly<{ goal: GoalRecord }>) {
  const description = goal.description?.text ?? "";
  const formattedStartDate = formatGoalDate(goal.startDate);
  const formattedDueDate = formatGoalDate(goal.dueDate);
  const category = goal.category?.[0];
  const categoryLabel = category ? CATEGORY_LABELS.get(category) : null;

  const dateRange = formatGoalDateRange(formattedStartDate, formattedDueDate);

  return (
    <div className="space-y-2">
      {categoryLabel ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{categoryLabel()}</Badge>
        </div>
      ) : null}
      {dateRange ? <p className="text-muted-foreground text-xs">{dateRange}</p> : null}
      {description ? <p className="text-foreground/80 text-sm">{description}</p> : null}
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

export function GoalEvent({ goals }: Readonly<GoalEventProps>) {
  const first = goals[0];
  if (goals.length === 1 && first) {
    return <SingleGoal goal={first} />;
  }
  return <GoalTable goals={goals} />;
}
