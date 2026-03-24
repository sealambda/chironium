import { Link } from "@tanstack/react-router";
import { differenceInYears, parseISO } from "date-fns";
import { ChevronRight, Target } from "lucide-react";
import type { ReactNode } from "react";

import type { Person } from "@/features/customers/api/persons-api";
import { AddGoalDialog } from "@/features/customers/ui/detail/add-goal-dialog";
import * as m from "@/paraglide/messages";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { CardAddButton } from "@/shared/ui/card-add-button";
import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { Separator } from "@/shared/ui/separator";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { getInitials } from "@/shared/utils/name-utils";
import { formatPersonName } from "@/shared/utils/person-utils";
import { getSubscriptionBadgeMetadata } from "@/shared/utils/subscriptions-utils";
import { cn } from "@/shared/utils/utils";

interface PersonProfileCardProps {
  person: Person;
  personId: string;
  patientId: string | null;
  goals: GoalItem[];
  currentSubscription?: SubscriptionRecord;
  isGoalsLoading?: boolean;
}

interface GoalItem {
  id: string;
  achievementStatus: string | null;
  description: { text: string | null } | null;
}

const goalStatus = {
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

type GoalAchievementStatus = (typeof goalStatus)[keyof typeof goalStatus];

const achievementStyles: Record<GoalAchievementStatus, string> = {
  [goalStatus.improving]: "border-emerald-200 bg-emerald-100 text-emerald-800",
  [goalStatus.achieved]: "border-emerald-200 bg-emerald-100 text-emerald-800",
  [goalStatus.sustaining]: "border-sky-200 bg-sky-100 text-sky-800",
  [goalStatus.inProgress]: "border-blue-200 bg-blue-100 text-blue-800",
  [goalStatus.noChange]: "border-neutral-200 bg-neutral-100 text-neutral-700",
  [goalStatus.noProgress]: "border-neutral-200 bg-neutral-100 text-neutral-700",
  [goalStatus.worsening]: "border-red-200 bg-red-100 text-red-800",
  [goalStatus.notAchieved]: "border-red-200 bg-red-100 text-red-800",
  [goalStatus.notAttainable]: "border-red-200 bg-red-100 text-red-800",
};

const achievementLabels: Record<GoalAchievementStatus, () => string> = {
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

const DEFAULT_ACHIEVEMENT_STYLE = achievementStyles[goalStatus.noChange];

function AchievementBadge({ status }: Readonly<{ status: string }>) {
  const style = achievementStyles[status as GoalAchievementStatus] ?? DEFAULT_ACHIEVEMENT_STYLE;
  const label = achievementLabels[status as GoalAchievementStatus]?.() ?? status;

  return <Badge className={cn("h-5 shrink-0 px-1.5 font-semibold text-xs", style)}>{label}</Badge>;
}

function getAgeLabel(birthDate?: string | null): string {
  if (!birthDate) {
    return "";
  }

  const parsedDate = parseISO(birthDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const age = differenceInYears(new Date(), parsedDate);
  if (age <= 0) {
    return "";
  }

  return ` (${age})`;
}

export function PersonProfileCard({
  person,
  personId,
  patientId,
  goals,
  currentSubscription,
  isGoalsLoading = false,
}: Readonly<PersonProfileCardProps>) {
  const name = formatPersonName(person.name);
  const initials = getInitials(name);
  const contact = extractContactInfo(person.telecom);
  const ageLabel = getAgeLabel(person.birthDate);
  const badgeMetadata = getSubscriptionBadgeMetadata(currentSubscription);
  const planBadgeLabel = badgeMetadata.statusLabel
    ? `${badgeMetadata.planLabel} - ${badgeMetadata.statusLabel}`
    : badgeMetadata.planLabel;
  const lastGoal = goals.at(-1);

  let goalContent: ReactNode;
  if (isGoalsLoading) {
    goalContent = <p className="text-base text-foreground/65">{m.common_loading()}</p>;
  } else if (lastGoal) {
    goalContent = (
      <p className="text-foreground/75 text-lg italic">"{lastGoal.description?.text ?? ""}"</p>
    );
  } else {
    goalContent = (
      <div className="flex items-center gap-2 text-foreground/65 text-sm">
        <Target className="size-4" />
        <span>{m.goals_no_goals_desc()}</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex flex-1 items-start gap-4">
          <Avatar className="size-24">
            <AvatarFallback className="bg-primary font-semibold text-2xl text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-2">
            <h1 className="font-bold text-foreground text-xl tracking-wide">
              {name}
              {ageLabel}
            </h1>
            <Badge className={badgeMetadata.badgeClassName}>
              <span className={cn("size-1.5 rounded-full", badgeMetadata.dotClassName)} />
              {planBadgeLabel}
            </Badge>
            <ContactButtonGroup {...contact} personName={name} />
          </div>
        </div>

        <Separator orientation="horizontal" className="lg:hidden" />
        <Separator orientation="vertical" className="hidden lg:block" />

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="font-bold text-foreground text-xl uppercase tracking-wide">
                {m.goals_title()}
              </p>
              {lastGoal?.achievementStatus ? (
                <AchievementBadge status={lastGoal.achievementStatus} />
              ) : null}
            </div>
            {patientId ? (
              <AddGoalDialog personId={personId} patientId={patientId}>
                <CardAddButton label={m.goals_add()} />
              </AddGoalDialog>
            ) : null}
          </div>

          {goalContent}

          {patientId ? (
            <Link
              to="/customers/$customerId/goals"
              params={{ customerId: personId }}
              className="mt-auto inline-flex items-center gap-1.5 text-foreground/70 text-sm transition-colors hover:text-foreground"
            >
              <span>{m.goals_view_history()}</span>
              <ChevronRight className="size-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
