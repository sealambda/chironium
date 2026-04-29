import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/utils/utils";

export const goalStatus = {
  improving: "IMPROVING",
  achieved: "ACHIEVED",
  sustaining: "SUSTAINING",
  inProgress: "IN_PROGRESS",
  noChange: "NO_CHANGE",
  noProgress: "NO_PROGRESS",
  worsening: "WORSENING",
  notAchieved: "NOT_ACHIEVED",
  notAttainable: "NOT_ATTAINABLE",
} as const;

export type GoalAchievementStatus = (typeof goalStatus)[keyof typeof goalStatus];

export const achievementStyles: Record<
  GoalAchievementStatus,
  "success" | "info" | "secondary" | "destructive"
> = {
  [goalStatus.improving]: "success",
  [goalStatus.achieved]: "success",
  [goalStatus.sustaining]: "info",
  [goalStatus.inProgress]: "info",
  [goalStatus.noChange]: "secondary",
  [goalStatus.noProgress]: "secondary",
  [goalStatus.worsening]: "destructive",
  [goalStatus.notAchieved]: "destructive",
  [goalStatus.notAttainable]: "destructive",
};

export const achievementLabels: Record<GoalAchievementStatus, () => string> = {
  [goalStatus.improving]: m.goals_status_improving,
  [goalStatus.achieved]: m.goals_status_achieved,
  [goalStatus.sustaining]: m.goals_status_sustaining,
  [goalStatus.inProgress]: m.goals_status_in_progress,
  [goalStatus.noChange]: m.goals_status_no_change,
  [goalStatus.noProgress]: m.goals_status_no_progress,
  [goalStatus.worsening]: m.goals_status_worsening,
  [goalStatus.notAchieved]: m.goals_status_not_achieved,
  [goalStatus.notAttainable]: m.goals_status_not_attainable,
};

const DEFAULT_ACHIEVEMENT_STYLE = "secondary";

export function AchievementBadge({ status }: Readonly<{ status: string }>) {
  const style = achievementStyles[status as GoalAchievementStatus] ?? DEFAULT_ACHIEVEMENT_STYLE;
  const label = achievementLabels[status as GoalAchievementStatus]?.() ?? status;

  return (
    <Badge variant={style} className={cn("h-5 shrink-0 px-1.5 font-semibold text-xs")}>
      {label}
    </Badge>
  );
}
