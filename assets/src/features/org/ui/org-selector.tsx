import { ChevronsUpDown, Plus } from "lucide-react";

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
import { cn } from "@/shared/utils/utils";

interface OrgSelectorProps {
  selectedOrg: OrganizationRecord | null;
  availableOrgs: OrganizationRecord[];
  onSelectOrg: (orgId: string) => void;
  onCreateClick: () => void;
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
 * Shows accessible organizations and a create option.
 * Renders as disabled when no organizations are available.
 */
export function OrgSelector({
  selectedOrg,
  availableOrgs,
  onSelectOrg,
  onCreateClick,
  showNameOnMobile = false,
}: Readonly<OrgSelectorProps>) {
  const isEmpty = availableOrgs.length === 0;
  const orgName = selectedOrg ? selectedOrg.name : m.org_none();
  const orgMark = getOrgMark(selectedOrg?.name ?? null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isEmpty}
        render={
          <button
            type="button"
            className={cn(
              "group flex w-full items-center gap-2 rounded-lg px-2 py-2",
              !showNameOnMobile && "justify-center md:justify-start",
              "text-left transition-colors focus-visible:outline-none",
              isEmpty
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/50",
            )}
          />
        }
      >
        <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-sm">
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
        {!isEmpty && (
          <ChevronsUpDown
            className={cn(
              "ml-auto size-4 shrink-0 opacity-50",
              !showNameOnMobile && "hidden md:block",
            )}
          />
        )}
      </DropdownMenuTrigger>
      {!isEmpty && (
        <DropdownMenuContent align="start" side="bottom" sideOffset={4} className="w-64 rounded-lg">
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            {m.nav_organization()}
          </DropdownMenuLabel>
          {availableOrgs.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => onSelectOrg(org.id)}
              className="gap-2 p-2"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-sm border font-bold text-xs">
                {getOrgMark(org.name)}
              </span>
              {org.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onCreateClick} className="gap-2 p-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-transparent">
              <Plus className="size-4" />
            </span>
            <span className="font-medium text-muted-foreground">{m.org_create()}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
