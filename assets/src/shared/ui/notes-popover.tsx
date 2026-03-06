import { formatDistanceToNowStrict } from "date-fns";
import { StickyNoteIcon } from "lucide-react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { Separator } from "@/shared/ui/separator";
import { getDateLocale } from "@/shared/utils/date-locale";

export interface Annotation {
  text?: string | null;
  authorString?: string | null;
  time?: string | null;
}

interface NotesPopoverProps {
  notes: Annotation[];
}

function NotesPopover({ notes }: NotesPopoverProps) {
  if (!notes.length) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="size-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label={m.notes_popover_title()}
          />
        }
      >
        <StickyNoteIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="max-h-64 w-80 overflow-y-auto">
        <PopoverHeader>
          <PopoverTitle>{m.notes_popover_title()}</PopoverTitle>
        </PopoverHeader>
        <div className="space-y-3">
          {notes.map((note, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: annotations have no stable ID
            <div key={index}>
              {index > 0 && <Separator className="mb-3" />}
              <p className="text-sm">{note.text ?? "—"}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                {note.authorString ?? m.notes_popover_no_author()}
                {note.time ? (
                  <>
                    {" · "}
                    {formatDistanceToNowStrict(new Date(note.time), {
                      locale: getDateLocale(),
                      addSuffix: true,
                    })}
                  </>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { NotesPopover };
