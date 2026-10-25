import { ChevronsUpDown, Plus, Ticket } from "lucide-react";

import type { OrganizationRecord } from "@/features/org/api/org-api";
import * as m from "@/paraglide/messages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { runtimeConfig } from "@/shared/utils/runtime-config";
import { cn } from "@/shared/utils/utils";

interface OrgSelectorProps {
  selectedOrg: OrganizationRecord | null;
  availableOrgs: OrganizationRecord[];
  onSelectOrg: (orgId: string) => void;
  onCreateClick: () => void;
  onJoinClick: () => void;
  showNameOnMobile?: boolean;
}

function getOrgMark(name: string | null): string {
  if (!name) {
    return "O";
  }

  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "O";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

/**
 * Organization selector dropdown for the sidebar navigation.
 * Shows accessible organizations and a create option, except in demo mode,
 * where each visitor gets exactly one organization.
 * Renders as disabled when no organizations are available.
 */
export function OrgSelector({
  selectedOrg,
  availableOrgs,
  onSelectOrg,
  onCreateClick,
  onJoinClick,
  showNameOnMobile = false,
}: Readonly<OrgSelectorProps>) {
  const isEmpty = availableOrgs.length === 0;
  const orgName = selectedOrg ? selectedOrg.name : m.org_none();
  const orgMark = getOrgMark(selectedOrg?.name ?? null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            data-testid="org-selector-trigger"
            className={cn(
              "group flex w-full items-center gap-2 rounded-lg px-2 py-2",
              !showNameOnMobile && "justify-center md:justify-start",
              "text-left transition-colors focus-visible:outline-none",
              "hover:bg-accent/50 focus-visible:bg-accent/50",
            )}
          />
        }
      >
        <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {orgMark}
        </span>
        <span
          className={cn(
            "grid min-w-0 flex-1 text-left text-sm leading-tight",
            !showNameOnMobile && "hidden md:grid",
          )}
        >
          <span className="truncate font-semibold">{orgName}</span>
        </span>
        <ChevronsUpDown
          className={cn(
            "ml-auto size-4 shrink-0 opacity-50",
            !showNameOnMobile && "hidden md:block",
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" sideOffset={4} className="w-64 rounded-lg">
        {!isEmpty && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {m.nav_organization()}
            </DropdownMenuLabel>
            <div className="max-h-80 overflow-y-auto pr-1">
              {availableOrgs.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => onSelectOrg(org.id)}
                  className="gap-2 p-2"
                  data-testid={`org-selector-item-${org.id}`}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-sm border text-xs font-bold">
                    {getOrgMark(org.name)}
                  </span>
                  {org.name}
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={onJoinClick}
          className="gap-2 p-2"
          data-testid="org-selector-join-by-invitation-button"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-transparent">
            <Ticket className="size-4" />
          </span>
          <span className="font-medium text-muted-foreground">{m.org_join_by_invitation()}</span>
        </DropdownMenuItem>
        {runtimeConfig.demo ? null : (
          <DropdownMenuItem
            onClick={onCreateClick}
            className="gap-2 p-2"
            data-testid="org-selector-create-button"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-transparent">
              <Plus className="size-4" />
            </span>
            <span className="font-medium text-muted-foreground">{m.org_create()}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
