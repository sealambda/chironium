import { ChevronDown, Plus } from "lucide-react";

import type { OrganizationRecord } from "@/features/org/api/org-api";
import * as m from "@/paraglide/messages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
 * Organisation selector dropdown for the top navigation.
 * Shows accessible organisations and create option.
 */
export function OrgSelector({
  selectedOrg,
  availableOrgs,
  onSelectOrg,
  onCreateClick,
  showNameOnMobile = false,
}: Readonly<OrgSelectorProps>) {
  const orgName = selectedOrg ? selectedOrg.name : m.org_none();
  const orgMark = getOrgMark(selectedOrg?.name ?? null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn([
              "group flex w-full items-center gap-2 rounded-lg py-1",
              showNameOnMobile
                ? "justify-start px-1"
                : "justify-center px-0 md:justify-start md:px-1",
              "cursor-pointer",
              "text-left transition-colors hover:bg-accent/50 focus-visible:bg-accent/50",
              "focus-visible:outline-none",
            ])}
          />
        }
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 font-bold text-primary text-sm">
          {orgMark}
        </span>
        <span
          className={cn(
            "min-w-0",
            showNameOnMobile ? "flex-none" : "hidden flex-1 md:block",
          )}
        >
          <span className="block truncate font-bold text-lg text-foreground leading-none tracking-tight">
            {orgName}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-65 transition-opacity group-hover:opacity-100",
            !showNameOnMobile && "hidden md:block",
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-0">
        <div className="p-1">
          {availableOrgs.map((org) => (
            <DropdownMenuItem
              key={org.id}
              className="min-h-11 cursor-pointer"
              onClick={() => onSelectOrg(org.id)}
            >
              {org.name}
            </DropdownMenuItem>
          ))}
        </div>
        <div className="sticky bottom-0 border-border/40 border-t bg-card/95">
          <button
            type="button"
            onClick={onCreateClick}
            className={cn([
              "flex h-9 w-full items-center gap-1.5 px-3",
              "cursor-pointer",
              "font-medium text-primary text-xs",
              "transition-colors hover:bg-accent",
              "focus-visible:bg-accent focus-visible:outline-none",
            ])}
          >
            <Plus className="h-3.5 w-3.5" />
            {m.org_create()}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
