import { PauseIcon, PlayIcon, PlusIcon, XIcon } from "lucide-react";

import type { SubscriptionHistoryRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";

import { subscriptionStatusConfig } from "../../model/status-config";

interface DesktopSubscriptionCardProps {
  subscription: SubscriptionHistoryRecord | undefined;
  isLoading?: boolean;
  onAdd: () => void;
  onPauseToggle: () => void;
  onCancel: () => void;
  isPauseToggling?: boolean;
  isCancelling?: boolean;
}

/**
 * Desktop subscription card with progress bar and action buttons.
 * Shows current subscription status with plus/pause/cancel controls.
 */
export function DesktopSubscriptionCard({
  subscription,
  isLoading,
  onAdd,
  onPauseToggle,
  onCancel,
  isPauseToggling,
  isCancelling,
}: Readonly<DesktopSubscriptionCardProps>) {
  const isActionable = subscription?.status === "active" || subscription?.status === "paused";
  const isPaused = subscription?.status === "paused";

  return (
    <div className="rounded-2xl border border-border/30 bg-violet-50/50 shadow-sm">
      {/* Header: title + action buttons */}
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className="font-bold text-foreground text-sm uppercase tracking-wide">
          {m.section_subscription()}
        </h3>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="size-8 border-violet-500 text-violet-600 hover:bg-violet-500 hover:text-white"
            onClick={onAdd}
            aria-label={m.sheet_add_subscription_title()}
          >
            <PlusIcon className="size-4" />
          </Button>

          {isActionable ? (
            <>
              <Button
                size="icon"
                variant="outline"
                className="size-8"
                onClick={onPauseToggle}
                disabled={isPauseToggling}
                aria-label={isPaused ? m.sub_resume() : m.sub_pause()}
              >
                {isPaused ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
              </Button>

              <Button
                size="icon"
                variant="outline"
                className="size-8 border-destructive text-destructive hover:bg-destructive/10"
                onClick={onCancel}
                disabled={isCancelling}
                aria-label={m.sub_cancel()}
              >
                <XIcon className="size-4" />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Body: progress bar or empty state */}
      <div className="px-6 pb-6">
        {(() => {
          if (isLoading) {
            return (
              <div className="space-y-3">
                <Skeleton className="h-2.5 w-full rounded-full" />
                <div className="grid grid-cols-3 gap-1">
                  <Skeleton className="h-8" />
                  <Skeleton className="mx-auto h-5 w-14" />
                  <Skeleton className="h-8" />
                </div>
              </div>
            );
          }
          if (subscription && isActionable) {
            return (
              <div className="space-y-3">
                <SubscriptionProgress subscription={subscription} />
                {isPaused ? (
                  <div className="flex justify-center">
                    <Badge variant={subscriptionStatusConfig.paused.variant}>
                      {subscriptionStatusConfig.paused.label}
                    </Badge>
                  </div>
                ) : null}
              </div>
            );
          }
          return <p className="text-center text-muted-foreground text-sm">{m.sub_no_active()}</p>;
        })()}
      </div>
    </div>
  );
}
