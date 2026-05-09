import { Plus, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import type { ClinicalNoteFormData } from "@/features/customers/api/observations-api";
import { ObservationForm } from "@/features/customers/ui/observation-form";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";

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
 * Final step: capture one or more free-text observations with datetime and body.
 * Uses the same add-to-list pattern as the org plans step: a single form
 * at the top, an "Add" button, and a compact summary list below.
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
  const [addedNotes, setAddedNotes] = useState<ObservationEntry[]>(() =>
    (initialData ?? []).map((n) => ({ ...n, id: nextId() })),
  );

  const [noteBody, setNoteBody] = useState(initialPending?.body ?? "");
  const [effectiveDate, setEffectiveDate] = useState(initialPending?.effectiveDate ?? "");
  const [effectiveTime, setEffectiveTime] = useState(initialPending?.effectiveTime ?? "");

  const submitting = isSubmitting ?? false;
  const hasInput = noteBody.trim();

  const handleRemove = (id: string) => {
    setAddedNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAdd = () => {
    if (!noteBody.trim()) {
      return;
    }
    setAddedNotes((prev) => [
      ...prev,
      {
        id: nextId(),
        body: noteBody.trim(),
        effectiveDate,
        effectiveTime,
      },
    ]);
    setNoteBody("");
    setEffectiveDate("");
    setEffectiveTime("");
  };

  const handleSubmit = () => {
    const pending: ClinicalNoteFormData[] = noteBody.trim()
      ? [{ body: noteBody.trim(), effectiveDate, effectiveTime }]
      : [];
    onSubmit([...addedNotes, ...pending]);
  };

  const handleBack = () => {
    const notes: ClinicalNoteFormData[] = addedNotes.map((n) => ({
      body: n.body,
      effectiveDate: n.effectiveDate,
      effectiveTime: n.effectiveTime,
    }));
    const pending: ClinicalNoteFormData | undefined = noteBody.trim()
      ? { body: noteBody.trim(), effectiveDate, effectiveTime }
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
        <ObservationForm
          body={noteBody}
          onBodyChange={setNoteBody}
          effectiveDate={effectiveDate}
          onEffectiveDateChange={setEffectiveDate}
          effectiveTime={effectiveTime}
          onEffectiveTimeChange={setEffectiveTime}
          rows={3}
          disabled={submitting}
        />

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleAdd}
          disabled={submitting || !hasInput}
        >
          <Plus className="size-4" data-icon="inline-start" />
          {m.common_add()}
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

function previewObservation(body: string): string {
  const preview = body.replace(/\s+/g, " ").trim();
  return preview.length > 64 ? `${preview.slice(0, 61)}...` : preview;
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
            <p className="truncate font-medium text-sm">{note.body}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(note.id)}
            aria-label={`${m.common_delete()}: ${previewObservation(note.body)}`}
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
}
