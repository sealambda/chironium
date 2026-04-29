import { differenceInYears, parseISO } from "date-fns";
import { Pencil, Plus, Target } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import type { Person } from "@/features/customers/api/persons-api";
import { EditPersonDialog } from "@/features/customers/ui/detail/edit-person-dialog";
import { EditSubscriptionDialog } from "@/features/customers/ui/detail/edit-subscription-dialog";
import { AchievementBadge } from "@/features/customers/ui/shared/achievement-badge";
import * as m from "@/paraglide/messages";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { Separator } from "@/shared/ui/separator";
import { Skeleton } from "@/shared/ui/skeleton";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { getInitials } from "@/shared/utils/name-utils";
import { formatPersonName } from "@/shared/utils/person-utils";
import { getSubscriptionBadgeMetadata } from "@/shared/utils/subscriptions-utils";
import { cn } from "@/shared/utils/utils";

import { CustomerDetailEmptyCardContent } from "./customer-detail-empty-card";

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

function PersonProfileCardGoalsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-6 w-full rounded-md" />
    </div>
  );
}

export function PersonProfileCard({
  person,
  personId,
  goals,
  currentSubscription,
  isGoalsLoading = false,
}: Readonly<PersonProfileCardProps>) {
  const [editOpen, setEditOpen] = useState(false);
  const name = formatPersonName(person.name);
  const initials = getInitials(name);
  const contact = extractContactInfo(person.telecom);
  const ageLabel = getAgeLabel(person.birthDate);
  const badgeMetadata = getSubscriptionBadgeMetadata(currentSubscription);
  const shouldCreateSubscription = !badgeMetadata.shouldEdit;
  const subscriptionForDialog = shouldCreateSubscription ? undefined : currentSubscription;
  const subscriptionActionLabel = shouldCreateSubscription
    ? m.person_header_add_subscription()
    : m.person_header_edit_subscription();
  const planBadgeLabel = badgeMetadata.statusLabel
    ? `${badgeMetadata.planLabel} - ${badgeMetadata.statusLabel}`
    : badgeMetadata.planLabel;
  const lastGoal = isGoalsLoading ? null : goals.at(-1);

  let goalContent: ReactNode;
  if (isGoalsLoading) {
    goalContent = <PersonProfileCardGoalsSkeleton />;
  } else if (lastGoal) {
    goalContent = (
      <p className="text-foreground/75 text-lg italic">"{lastGoal.description?.text ?? ""}"</p>
    );
  } else {
    goalContent = (
      <CustomerDetailEmptyCardContent
        icon={Target}
        title={m.goals_no_goals()}
        description={m.goals_no_goals_desc()}
      />
    );
  }

  return (
    <>
      <EditPersonDialog person={person} open={editOpen} onOpenChange={setEditOpen} />
      <Card>
        <CardContent className="p-4 shadow-sm lg:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
            <div className="flex flex-1 items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-4">
                <Avatar className="size-22 sm:size-24">
                  <AvatarFallback className="bg-primary font-semibold text-2xl text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex min-w-0 flex-col items-start gap-2 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-bold text-foreground text-xl tracking-wide">
                      {name}
                      {ageLabel}
                    </h1>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      aria-label={m.person_header_edit_profile()}
                      data-testid="customer-person-edit-button"
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center">
                    <Badge className={badgeMetadata.badgeClassName}>
                      <span
                        className={cn(
                          "hidden size-1.5 rounded-full sm:inline-block",
                          badgeMetadata.dotClassName,
                        )}
                      />
                      {planBadgeLabel}
                      <EditSubscriptionDialog
                        personId={personId}
                        currentSubscription={subscriptionForDialog}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-mr-1.5 ml-0.5 size-5 rounded-full"
                          aria-label={subscriptionActionLabel}
                          data-testid="customer-subscription-edit-button"
                        >
                          {shouldCreateSubscription ? (
                            <Plus className="size-3" />
                          ) : (
                            <Pencil className="size-3" />
                          )}
                        </Button>
                      </EditSubscriptionDialog>
                    </Badge>
                  </div>
                  <ContactButtonGroup {...contact} personName={name} />
                </div>
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
              </div>

              {goalContent}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
