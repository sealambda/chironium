import { Building2 } from "lucide-react";

import * as m from "@/paraglide/messages";
import { EmptyState } from "@/shared/ui/empty-state";
import { getCsrfToken } from "@/shared/utils/request-utils";
import { runtimeConfig } from "@/shared/utils/runtime-config";

/** A plain form POST, so the server signs the visitor in and redirects. */
function startNewDemo() {
  const form = document.createElement("form");
  form.method = "post";
  form.action = "/demo";
  const csrf = document.createElement("input");
  csrf.type = "hidden";
  csrf.name = "_csrf_token";
  csrf.value = getCsrfToken() ?? "";
  form.append(csrf);
  document.body.append(form);
  form.submit();
}

/**
 * Shown when the authenticated user has no organization membership.
 * Prompts them to create their first organization or request an invitation.
 * In demo mode the visitor's organization was deleted, so it offers a new demo instead.
 */
export function NoOrgScreen({
  onCreateOrgClick,
  onJoinOrgClick,
}: Readonly<{ onCreateOrgClick: () => void; onJoinOrgClick: () => void }>) {
  const joinAction = {
    label: m.org_join_by_invitation(),
    testId: "no-org-join-by-invitation-button",
    onAction: onJoinOrgClick,
  };

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
                onAction: startNewDemo,
              },
              joinAction,
            ]}
            className="w-full"
          />
        ) : (
          <EmptyState
            icon={Building2}
            title={m.org_no_access_title()}
            description={m.org_no_access_desc()}
            actions={[
              joinAction,
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
