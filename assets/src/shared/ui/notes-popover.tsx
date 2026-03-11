import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { formatDistanceToNowStrict } from "date-fns";
import { PencilIcon, PlusIcon, StickyNoteIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

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
import { Textarea } from "@/shared/ui/textarea";
import { getDateLocale } from "@/shared/utils/date-locale";
import { cn } from "@/shared/utils/utils";

export interface Annotation {
  text?: string | null;
  authorReference?: string | null;
  authorString?: string | null;
  time?: string | null;
}

interface NotesPopoverProps {
  notes: Annotation[];
  onAddNote?: (text: string) => Promise<void>;
  onUpdateNote?: (index: number, text: string) => Promise<void>;
  onDeleteNote?: (index: number) => Promise<void>;
  /** Opens on hover only, with no click-to-toggle behavior. Use for read-only notes. */
  hoverOnly?: boolean;
  /** When provided, edit and delete actions are restricted to notes authored by this user. */
  currentUserId?: string;
  /** Optional display name used when authorString is missing for current user's notes. */
  currentUserName?: string;
}

// ─── Edit form ───────────────────────────────────────────────────────

interface EditNoteFormProps {
  value: string;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function EditNoteForm({ value, saving, onChange, onSave, onCancel }: EditNoteFormProps) {
  return (
    <div className="space-y-2">
      <Textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        disabled={saving}
        className="text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving || !value.trim()}>
          {saving ? m.common_saving() : m.common_save()}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          {m.common_cancel()}
        </Button>
      </div>
    </div>
  );
}

// ─── Note item ───────────────────────────────────────────────────────

interface NoteItemProps {
  note: Annotation;
  currentUserId?: string;
  currentUserName?: string;
  canEdit: boolean;
  saving: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function NoteItem({
  note,
  currentUserId,
  currentUserName,
  canEdit,
  saving,
  onEdit,
  onDelete,
}: NoteItemProps) {
  const authorLabel =
    note.authorString ??
    (currentUserId && note.authorReference === currentUserId ? currentUserName : null) ??
    m.notes_popover_no_author();

  return (
    <div className="group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">{note.text ?? "—"}</p>
        {canEdit ? (
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onEdit}
              disabled={saving}
              aria-label={m.notes_edit_aria()}
            >
              <PencilIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onDelete}
              disabled={saving}
              aria-label={m.notes_delete_aria()}
              className="text-destructive/60 hover:text-destructive"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
      <p className="mt-1 text-muted-foreground text-xs">
        {authorLabel}
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
  );
}

// ─── Main component ──────────────────────────────────────────────────

function NotesPopover({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  hoverOnly,
  currentUserId,
  currentUserName,
}: NotesPopoverProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditable = Boolean(onAddNote ?? onUpdateNote ?? onDeleteNote);
  // When a currentUserId is provided, restrict edit/delete to notes authored by that user.
  const canEditNote = (note: Annotation) =>
    isEditable &&
    (!currentUserId ||
      note.authorReference === currentUserId ||
      note.authorString === currentUserId);
  const hasNotes = notes.length > 0;
  // Editable popovers always use click-to-open behavior for reliable interaction.
  const useHoverOnly = hoverOnly && !isEditable;

  // In read-only mode, don't render when there are no notes to show.
  if (!isEditable && !hasNotes) {
    return null;
  }

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditText(index === -1 ? "" : (notes[index]?.text ?? ""));
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText("");
  };

  const handleSave = async () => {
    const text = editText.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      if (editingIndex === -1) {
        await onAddNote?.(text);
      } else if (editingIndex !== null) {
        await onUpdateNote?.(editingIndex, text);
      }
      setEditingIndex(null);
      setEditText("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (index: number) => {
    setSaving(true);
    try {
      await onDeleteNote?.(index);
    } finally {
      setSaving(false);
    }
  };

  const triggerClassName = hasNotes
    ? "text-muted-foreground hover:text-foreground"
    : "text-muted-foreground/30 hover:text-muted-foreground";

  const notesList = (
    <>
      <div className="max-h-56 space-y-3 overflow-y-auto">
        {notes.map((note, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: annotations have no stable ID
          <div key={index}>
            {index > 0 && <Separator className="mb-3" />}
            {editingIndex === index ? (
              <EditNoteForm
                value={editText}
                saving={saving}
                onChange={setEditText}
                onSave={handleSave}
                onCancel={cancelEdit}
              />
            ) : (
              <NoteItem
                note={note}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                canEdit={canEditNote(note)}
                saving={saving}
                onEdit={() => startEdit(index)}
                onDelete={() => void handleDelete(index)}
              />
            )}
          </div>
        ))}

        {editingIndex === -1 && (
          <>
            {hasNotes && <Separator className="mb-3" />}
            <EditNoteForm
              value={editText}
              saving={saving}
              onChange={setEditText}
              onSave={handleSave}
              onCancel={cancelEdit}
            />
          </>
        )}
      </div>

      {isEditable && editingIndex === null && (
        <div className={hasNotes ? "mt-3 border-t border-border pt-3" : ""}>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => startEdit(-1)}
            disabled={saving}
          >
            <PlusIcon className="size-4" data-icon="inline-start" />
            {m.notes_add()}
          </Button>
        </div>
      )}
    </>
  );

  if (useHoverOnly) {
    return (
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger
          delay={200}
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className={triggerClassName}
              aria-label={m.notes_popover_title()}
            />
          }
        >
          <StickyNoteIcon className="size-3.5" />
        </TooltipPrimitive.Trigger>
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
                "w-80 origin-(--transform-origin) rounded-md bg-popover p-4 text-popover-foreground text-sm shadow-md outline-hidden ring-1 ring-foreground/10 duration-100 data-closed:animate-out data-open:animate-in",
              )}
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest">
                {m.notes_popover_title()}
              </p>
              {notesList}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={200}
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className={triggerClassName}
            aria-label={m.notes_popover_title()}
          />
        }
      >
        <StickyNoteIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle className="text-xs font-semibold uppercase tracking-widest">
            {m.notes_popover_title()}
          </PopoverTitle>
        </PopoverHeader>
        {notesList}
      </PopoverContent>
    </Popover>
  );
}

export { NotesPopover };
