import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { InfoIcon } from "lucide-react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/utils";

export interface CodingEntry {
  system: string;
  code: string;
  display?: string | null;
  version?: string | null;
}

interface CodingPopoverProps {
  codings: CodingEntry[];
}

export function CodingPopover({ codings }: Readonly<CodingPopoverProps>) {
  if (codings.length === 0) return null;

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger
        delay={200}
        render={
          <Button variant="ghost" size="icon-xs" aria-label={m.coding_info_title()}>
            <InfoIcon className="size-3.5" />
          </Button>
        }
      />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner
          side="left"
          align="start"
          sideOffset={4}
          className="isolate z-50"
        >
          <TooltipPrimitive.Popup
            className={cn(
              "data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
              "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
              "w-64 origin-(--transform-origin) rounded-md bg-popover p-4 text-popover-foreground text-sm shadow-md outline-hidden ring-1 ring-foreground/10 duration-100 data-closed:animate-out data-open:animate-in",
            )}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest">
              {m.coding_info_title()}
            </p>
            <div className="space-y-3">
              {codings.map((c, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: codings have no stable id
                <dl key={i} className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
                  <dt className="text-foreground/60">{m.coding_info_system()}</dt>
                  <dd className="break-all font-mono">{c.system}</dd>
                  <dt className="text-foreground/60">{m.coding_info_code()}</dt>
                  <dd className="font-mono">{c.code}</dd>
                  {c.display ? (
                    <>
                      <dt className="text-foreground/60">{m.coding_info_display()}</dt>
                      <dd>{c.display}</dd>
                    </>
                  ) : null}
                  {c.version ? (
                    <>
                      <dt className="text-foreground/60">{m.coding_info_version()}</dt>
                      <dd className="font-mono">{c.version}</dd>
                    </>
                  ) : null}
                </dl>
              ))}
            </div>
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
