import { ChevronDown, Plus } from "lucide-react";

import type { OrganizationSummary } from "@/features/org/api/org-api";
import * as m from "@/paraglide/messages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface OrgSelectorProps {
  selectedOrg: OrganizationSummary | null;
  availableOrgs: OrganizationSummary[];
  onSelectOrg: (orgId: string) => void;
  onCreateClick: () => void;
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
}: Readonly<OrgSelectorProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={[
              "flex items-center gap-1",
              "text-left font-semibold text-sm",
              "text-foreground transition-colors hover:text-primary focus-visible:text-primary",
              "focus-visible:outline-none",
            ].join(" ")}
          />
        }
      >
        {selectedOrg ? selectedOrg.name : m.org_none()}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 p-0">
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
            className={[
              "flex h-9 w-full items-center gap-1.5 px-3",
              "font-medium text-primary text-xs",
              "transition-colors hover:bg-accent",
              "focus-visible:bg-accent focus-visible:outline-none",
            ].join(" ")}
          >
            <Plus className="h-3.5 w-3.5" />
            {m.org_create()}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
