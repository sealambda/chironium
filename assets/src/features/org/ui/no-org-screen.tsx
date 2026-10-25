import { Building2 } from "lucide-react";

import * as m from "@/paraglide/messages";
import { EmptyState } from "@/shared/ui/empty-state";
import { submitForm } from "@/shared/utils/request-utils";
import { runtimeConfig } from "@/shared/utils/runtime-config";

/**
 * Shown when the authenticated user has no organization membership.
 * Prompts them to create their first organization or request an invitation.
 * In demo mode the cleanup deleted the visitor along with their organization, so it offers
 * only a new demo: joining by invitation would fail without a user.
 */
export function NoOrgScreen({
  onCreateOrgClick,
  onJoinOrgClick,
}: Readonly<{ onCreateOrgClick: () => void; onJoinOrgClick: () => void }>) {
  return (
    <div className="flex h-[calc(100svh-4rem)] items-center justify-center">
      <div className="w-full max-w-lg space-y-3">
        {runtimeConfig.demo ? (
          <EmptyState
            icon={Building2}
            title={m.demo_ended_title()}
            actions={[
              {
                label: m.demo_start_new(),
                testId: "no-org-start-demo-button",
                onAction: () => submitForm("/demo"),
              },
            ]}
            className="w-full"
          />
        ) : (
          <EmptyState
            icon={Building2}
            title={m.org_no_access_title()}
            description={m.org_no_access_desc()}
            actions={[
              {
                label: m.org_join_by_invitation(),
                testId: "no-org-join-by-invitation-button",
                onAction: onJoinOrgClick,
              },
              {
                label: m.org_no_access_action(),
                testId: "no-org-create-organization-button",
                onAction: onCreateOrgClick,
              },
            ]}
            className="w-full"
          />
        )}
      </div>
    </div>
  );
}
