import { ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { Organisation } from "@/gql/graphql";

interface OrgSelectorProps {
  selectedOrg: Organisation | null;
  availableOrgs: Organisation[];
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
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">
        Select an organization
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={[
              "flex items-center gap-1",
              "text-left font-semibold text-sm",
              "text-foreground transition-colors hover:text-primary focus-visible:text-primary",
              "focus-visible:outline-none",
            ].join(" ")}
          >
            {selectedOrg ? selectedOrg.name : "No Organisations"}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
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
              Create New Organisation
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
