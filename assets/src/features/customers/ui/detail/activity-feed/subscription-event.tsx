import { Pencil } from "lucide-react";

import { EditSubscriptionDialog } from "@/features/customers/ui/detail/edit-subscription-dialog";
import * as m from "@/paraglide/messages";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";
import { Button } from "@/shared/ui/button";

type SubscriptionVariant = "started" | "ending" | "paused" | "resumed" | "cancelled";

interface SubscriptionPause {
  id: string;
  startDate: string;
  endDate?: string | null;
  reason?: string | null;
}

interface SubscriptionEventProps {
  variant: SubscriptionVariant;
  pause?: SubscriptionPause;
}

export function SubscriptionEvent({ pause }: Readonly<SubscriptionEventProps>) {
  const reason = pause?.reason?.trim();

  if (!reason) {
    return null;
  }

  return (
    <p className="border-muted-foreground/20 border-l-2 pl-2.5 text-muted-foreground text-xs italic">
      {reason}
    </p>
  );
}

interface SubscriptionEditActionProps {
  subscription: SubscriptionRecord;
  personId: string;
}

export function SubscriptionEditAction({
  subscription,
  personId,
}: Readonly<SubscriptionEditActionProps>) {
  return (
    <EditSubscriptionDialog personId={personId} currentSubscription={subscription}>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground"
        aria-label={m.person_header_edit_subscription()}
      >
        <Pencil className="size-3.5" />
      </Button>
    </EditSubscriptionDialog>
  );
}
