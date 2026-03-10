import { Plus, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import type { ClinicalNoteFormData } from "@/features/customers/api/observations-api";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { MarkdownToolbar } from "@/shared/ui/markdown-toolbar";
import { Textarea } from "@/shared/ui/textarea";

import { StepLayout } from "./step-layout";

interface ObservationsStepProps {
  readonly initialData?: ClinicalNoteFormData[];
  readonly initialPending?: ClinicalNoteFormData;
  readonly isSubmitting?: boolean;
  readonly onSubmit: (notes: ClinicalNoteFormData[]) => void;
  readonly onBack: () => void;
  readonly onSaveDraft?: (notes: ClinicalNoteFormData[], pending?: ClinicalNoteFormData) => void;
}

interface ObservationEntry extends ClinicalNoteFormData {
  id: string;
}

/**
 * Step 8: Capture one or more clinical note observations, each with a title and body.
 * Uses the same add-to-list pattern as the org plans step: a single form
 * at the top, an "Add" button, and a compact summary list below.
 * The body field includes a markdown toolbar for formatting.
 */
export function ObservationsStep({
  initialData,
  initialPending,
  isSubmitting,
  onSubmit,
  onBack,
  onSaveDraft,
}: ObservationsStepProps) {
  const idPrefix = useId();
  const counterRef = useRef(0);
  const nextId = () => `${idPrefix}-${++counterRef.current}`;
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [addedNotes, setAddedNotes] = useState<ObservationEntry[]>(() =>
    (initialData ?? []).map((n) => ({ ...n, id: nextId() })),
  );

  const [noteBody, setNoteBody] = useState(initialPending?.body ?? "");

  const submitting = isSubmitting ?? false;
  const hasInput = noteBody.trim();

  const handleRemove = (id: string) => {
    setAddedNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAdd = () => {
    if (!noteBody.trim()) {
      return;
    }
    setAddedNotes((prev) => [...prev, { id: nextId(), body: noteBody.trim() }]);
    setNoteBody("");
  };

  const handleSubmit = () => {
    const pending: ClinicalNoteFormData[] = noteBody.trim() ? [{ body: noteBody.trim() }] : [];
    onSubmit([...addedNotes, ...pending]);
  };

  const handleBack = () => {
    const notes: ClinicalNoteFormData[] = addedNotes.map((n) => ({ body: n.body }));
    const pending: ClinicalNoteFormData | undefined = noteBody.trim()
      ? { body: noteBody.trim() }
      : undefined;
    onSaveDraft?.(notes, pending);
    onBack();
  };

  return (
    <StepLayout
      title={m.step_observations_title()}
      description={m.step_observations_desc()}
      isSubmitting={submitting}
      isLastStep
      onSubmit={handleSubmit}
      onBack={handleBack}
    >
      <div className="space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel>{m.field_observation_body()}</FieldLabel>
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
                placeholder={m.field_observation_body_placeholder()}
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
          {m.observation_add()}
        </Button>

        <ObservationList notes={addedNotes} onRemove={handleRemove} />
      </div>
    </StepLayout>
  );
}

interface ObservationListProps {
  readonly notes: ObservationEntry[];
  readonly onRemove: (id: string) => void;
}

function ObservationList({ notes, onRemove }: ObservationListProps) {
  if (notes.length === 0) {
    return (
      <p className="py-2 text-center text-muted-foreground text-sm">{m.observation_empty_hint()}</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">
        {m.observation_added({ count: notes.length })}
      </p>
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
            aria-label={m.observation_remove()}
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
}
