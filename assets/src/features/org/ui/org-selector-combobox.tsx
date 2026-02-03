"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import type { Organization } from "@/gql/graphql";
import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/shared/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverPositioner,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { cn } from "@/shared/utils";

interface OrgSelectorComboboxProps {
  selectedOrg: Organization | null;
  availableOrgs: Organization[];
  onSelectOrg: (orgId: string) => Promise<void>;
  onCreateClick: () => void;
}

/**
 * Organization selector using Popover + Command composition.
 * Provides search/filtering for users with many organizations.
 * Follows basecn pattern with minimal customization.
 */
export function OrgSelectorCombobox({
  selectedOrg,
  availableOrgs,
  onSelectOrg,
  onCreateClick,
}: Readonly<OrgSelectorComboboxProps>) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(triggerProps) => (
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="w-fit min-w-[180px] max-w-full h-auto py-0 justify-start px-0 hover:bg-transparent"
            {...triggerProps}
          >
            <span className="truncate font-semibold text-sm">
              {availableOrgs.length === 0
                ? "No Organizations"
                : selectedOrg
                  ? selectedOrg.name
                  : "Select organization..."}
            </span>
            <ChevronDown
              className={cn(
                "ml-0.5 h-4 w-4 shrink-0 opacity-50 transition-transform",
                open && "rotate-180",
              )}
            />
          </Button>
        )}
      />
      <PopoverPositioner side="bottom" sideOffset={4}>
        <PopoverContent className="w-[--anchor-width] p-0">
          <Command>
            <CommandInput placeholder="Search organizations..." />
            <CommandList>
              <CommandEmpty>No organization found.</CommandEmpty>
              <CommandGroup>
                {availableOrgs.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={org.name}
                    onSelect={() => {
                      onSelectOrg(org.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedOrg?.id === org.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {org.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onCreateClick();
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Organisation
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </PopoverPositioner>
    </Popover>
  );
}
