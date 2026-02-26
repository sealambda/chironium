import { Plus, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import type { NoteFormData } from "@/features/customers/api/observations-api";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { MarkdownToolbar } from "@/shared/ui/markdown-toolbar";
import { Textarea } from "@/shared/ui/textarea";

import { StepLayout } from "./step-layout";

interface NotesStepProps {
  readonly initialData?: NoteFormData[];
  readonly initialPending?: NoteFormData;
  readonly isSubmitting?: boolean;
  readonly onSubmit: (notes: NoteFormData[]) => void;
  readonly onBack: () => void;
  readonly onSaveDraft?: (notes: NoteFormData[], pending?: NoteFormData) => void;
}

interface NoteEntry extends NoteFormData {
  id: string;
}

/**
 * Step 8: Capture one or more free-text notes, each with a title and body.
 * Uses the same add-to-list pattern as the org plans step: a single form
 * at the top, an "Add" button, and a compact summary list below.
 * The body field includes a markdown toolbar for formatting.
 */
export function NotesStep({
  initialData,
  initialPending,
  isSubmitting,
  onSubmit,
  onBack,
  onSaveDraft,
}: NotesStepProps) {
  const idPrefix = useId();
  const counterRef = useRef(0);
  const nextId = () => `${idPrefix}-${++counterRef.current}`;
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [addedNotes, setAddedNotes] = useState<NoteEntry[]>(() =>
    (initialData ?? []).map((n) => ({ ...n, id: nextId() })),
  );

  const [noteTitle, setNoteTitle] = useState(initialPending?.title ?? "");
  const [noteBody, setNoteBody] = useState(initialPending?.body ?? "");

  const submitting = isSubmitting ?? false;
  const hasInput = noteTitle.trim() || noteBody.trim();

  const handleRemove = (id: string) => {
    setAddedNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAdd = () => {
    if (!noteTitle.trim() && !noteBody.trim()) {
      return;
    }
    setAddedNotes((prev) => [
      ...prev,
      { id: nextId(), title: noteTitle.trim(), body: noteBody.trim() },
    ]);
    setNoteTitle("");
    setNoteBody("");
  };

  const handleSubmit = () => {
    const pending: NoteFormData[] =
      noteTitle.trim() || noteBody.trim()
        ? [{ title: noteTitle.trim(), body: noteBody.trim() }]
        : [];
    onSubmit([...addedNotes, ...pending]);
  };

  const handleBack = () => {
    const notes: NoteFormData[] = addedNotes.map((n) => ({ title: n.title, body: n.body }));
    const pending =
      noteTitle.trim() || noteBody.trim()
        ? { title: noteTitle.trim(), body: noteBody.trim() }
        : undefined;
    onSaveDraft?.(notes, pending);
    onBack();
  };

  return (
    <StepLayout
      title={m.step_notes_title()}
      description={m.step_notes_desc()}
      isSubmitting={submitting}
      isLastStep
      onSubmit={handleSubmit}
      onBack={handleBack}
    >
      <div className="space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel>{m.field_note_title()}</FieldLabel>
            <Input
              maxLength={100}
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder={m.field_note_title_placeholder()}
              disabled={submitting}
            />
          </Field>

          <Field>
            <FieldLabel>{m.field_note_body()}</FieldLabel>
            <div>
              <MarkdownToolbar
                textareaRef={bodyTextareaRef}
                value={noteBody}
                onChange={(v) => setNoteBody(v)}
              />
              <Textarea
                ref={bodyTextareaRef}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder={m.field_note_body_placeholder()}
                rows={3}
                disabled={submitting}
                className="rounded-t-none border-t-0"
              />
            </div>
          </Field>
        </FieldGroup>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleAdd}
          disabled={submitting || !hasInput}
        >
          <Plus className="size-4" data-icon="inline-start" />
          {m.note_add()}
        </Button>

        <NoteList notes={addedNotes} onRemove={handleRemove} />
      </div>
    </StepLayout>
  );
}

interface NoteListProps {
  readonly notes: NoteEntry[];
  readonly onRemove: (id: string) => void;
}

function NoteList({ notes, onRemove }: NoteListProps) {
  if (notes.length === 0) {
    return <p className="py-2 text-center text-muted-foreground text-sm">{m.note_empty_hint()}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">{m.note_added({ count: notes.length })}</p>
      {notes.map((note) => (
        <div
          key={note.id}
          className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{note.title || note.body}</p>
            {note.title && note.body ? (
              <p className="truncate text-muted-foreground text-xs">{note.body}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(note.id)}
            aria-label={m.note_remove()}
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
}
