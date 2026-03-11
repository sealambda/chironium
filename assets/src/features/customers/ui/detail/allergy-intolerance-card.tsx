import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  type AllergyIntoleranceItem,
  createAllergiesAndIntolerances,
} from "@/features/customers/api/allergy-intolerance-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { CardAddButton } from "@/shared/ui/card-add-button";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import { TagInput } from "@/shared/ui/tag-input";

// ─── Props ───────────────────────────────────────────────────────────

interface AllergyIntoleranceCardProps {
  personId: string;
  patientId: string | null;
  items: AllergyIntoleranceItem[];
  isLoading?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function parseItemTags(items: AllergyIntoleranceItem[], type: string): string[] {
  return items
    .filter((item) => item.type === type)
    .map((item) => item.code?.text ?? item.code?.coding?.[0]?.display ?? "")
    .filter(Boolean);
}

// ─── Tag column ─────────────────────────────────────────────────────

interface TagColumnProps {
  label: string;
  tags: string[];
  tagClassName: string;
  emptyText: string;
  className?: string;
}

function TagColumn({ label, tags, tagClassName, emptyText, className }: Readonly<TagColumnProps>) {
  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <p className="font-bold text-foreground text-xl uppercase tracking-wide">{label}</p>
      {tags.length === 0 ? (
        <p className="text-foreground/40 text-sm italic">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm ${tagClassName}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add dialog ──────────────────────────────────────────────────────

interface AddAllergyIntoleranceDialogProps {
  personId: string;
  patientId: string | null;
  children: React.ReactNode;
}

function AddAllergyIntoleranceDialog({
  personId,
  patientId,
  children,
}: Readonly<AddAllergyIntoleranceDialogProps>) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const hasContent = allergies.length > 0 || intolerances.length > 0;

  const resetForm = () => {
    setAllergies([]);
    setIntolerances([]);
  };

  const handleSubmit = async () => {
    if (!hasContent || !patientId) {
      if (!patientId) {
        toast.error(m.onboarding_error());
      }
      return;
    }

    setSaving(true);
    try {
      await createAllergiesAndIntolerances(
        { allergies, intolerances },
        patientId,
        selectedOrg?.id ?? "",
      );

      await queryClient.invalidateQueries({
        queryKey: ["person", personId, "allergyIntolerances"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["person", personId, "patient-detail"],
      });

      toast.success(m.allergy_intolerance_add_success());
      setOpen(false);
      resetForm();
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.allergy_intolerance_dialog_title()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <TagInput
            label={m.allergy_intolerance_allergies_label()}
            placeholder={m.field_allergies_placeholder()}
            tags={allergies}
            onAdd={(tag) => setAllergies((prev) => [...prev, tag])}
            onRemove={(i) => setAllergies((prev) => prev.filter((_, idx) => idx !== i))}
            addLabel={m.common_add()}
            disabled={saving}
          />
          <TagInput
            label={m.allergy_intolerance_intolerances_label()}
            placeholder={m.field_intolerances_placeholder()}
            tags={intolerances}
            onAdd={(tag) => setIntolerances((prev) => [...prev, tag])}
            onRemove={(i) => setIntolerances((prev) => prev.filter((_, idx) => idx !== i))}
            addLabel={m.common_add()}
            disabled={saving}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !hasContent}>
            {saving ? m.common_saving() : m.allergy_intolerance_dialog_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────

function AllergyIntoleranceCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-20" />
          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={String(i)} className="h-7 w-18 rounded-full" />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-24" />
          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={String(i)} className="h-7 w-22 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function AllergyIntoleranceCard({
  personId,
  patientId,
  items,
  isLoading,
}: Readonly<AllergyIntoleranceCardProps>) {
  if (isLoading) {
    return <AllergyIntoleranceCardSkeleton />;
  }

  const allergyTags = parseItemTags(items, "ALLERGY");
  const intoleranceTags = parseItemTags(items, "INTOLERANCE");
  const isEmpty = allergyTags.length === 0 && intoleranceTags.length === 0;

  const viewHistoryLink = (
    <div className="mt-auto border-neutral-200 border-t pt-3" style={{ marginTop: "1rem" }}>
      <Link
        to="/customers/$customerId/allergies"
        params={{ customerId: personId }}
        className="flex items-center gap-1.5 text-foreground/70 text-sm transition-colors hover:text-foreground"
      >
        <span>{m.allergy_intolerance_view_history()}</span>
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );

  if (isEmpty) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
        <div className="flex items-start justify-end">
          <AddAllergyIntoleranceDialog personId={personId} patientId={patientId}>
            <CardAddButton label={m.allergy_intolerance_add()} />
          </AddAllergyIntoleranceDialog>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6">
          <AlertTriangle className="size-8 text-neutral-400" />
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">{m.allergy_intolerance_empty()}</p>
            <p className="text-foreground/65 text-xs">{m.allergy_intolerance_empty_desc()}</p>
          </div>
        </div>
        {viewHistoryLink}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
      <AddAllergyIntoleranceDialog personId={personId} patientId={patientId}>
        <CardAddButton
          label={m.allergy_intolerance_add()}
          className="absolute top-4 right-4 lg:top-5 lg:right-5"
        />
      </AddAllergyIntoleranceDialog>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TagColumn
          label={m.allergy_intolerance_allergies_label()}
          tags={allergyTags}
          tagClassName="border-red-200 bg-red-50 text-red-800"
          emptyText={m.allergy_intolerance_none_allergies()}
        />
        <TagColumn
          label={m.allergy_intolerance_intolerances_label()}
          tags={intoleranceTags}
          tagClassName="border-amber-200 bg-amber-50 text-amber-800"
          emptyText={m.allergy_intolerance_none_intolerances()}
          className="sm:border-neutral-200 sm:border-l sm:pl-4"
        />
      </div>

      {viewHistoryLink}
    </div>
  );
}
