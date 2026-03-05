import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, PlusIcon, Utensils } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createFoodObservations } from "@/features/customers/api/food-preferences-api";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
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

interface FoodPreferencesCardProps {
  personId: string;
  patientId: string | null;
  included: string[];
  excluded: string[];
  isLoading?: boolean;
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

interface AddFoodPreferenceDialogProps {
  personId: string;
  patientId: string | null;
  children: React.ReactNode;
}

function AddFoodPreferenceDialog({
  personId,
  patientId,
  children,
}: Readonly<AddFoodPreferenceDialogProps>) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [included, setIncluded] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const { selectedOrg } = useOrg();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const hasContent = included.length > 0 || excluded.length > 0;

  const resetForm = () => {
    setIncluded([]);
    setExcluded([]);
  };

  const handleSubmit = async () => {
    if (!hasContent || !patientId) {
      if (!patientId) {
        toast.error(m.customers_detail_missing_patient());
      }
      return;
    }

    setSaving(true);
    try {
      await createFoodObservations(
        { included, excluded },
        patientId,
        selectedOrg?.id ?? "",
        user?.id ?? "",
      );

      await queryClient.invalidateQueries({
        queryKey: ["person", personId, "foodPreferences"],
      });

      toast.success(m.food_preferences_add_success());
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
          <DialogTitle>{m.food_preferences_dialog_title()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <TagInput
            label={m.food_preferences_includes_label()}
            placeholder={m.field_food_included_placeholder()}
            tags={included}
            onAdd={(tag) => setIncluded((prev) => [...prev, tag])}
            onRemove={(i) => setIncluded((prev) => prev.filter((_, idx) => idx !== i))}
            addLabel={m.common_add()}
            disabled={saving}
          />
          <TagInput
            label={m.food_preferences_avoids_label()}
            placeholder={m.field_food_excluded_placeholder()}
            tags={excluded}
            onAdd={(tag) => setExcluded((prev) => [...prev, tag])}
            onRemove={(i) => setExcluded((prev) => prev.filter((_, idx) => idx !== i))}
            addLabel={m.common_add()}
            disabled={saving}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !hasContent}>
            {saving ? m.common_saving() : m.food_preferences_dialog_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────

function FoodPreferencesCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-16" />
          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={String(i)} className="h-7 w-18 rounded-full" />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-20" />
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

export function FoodPreferencesCard({
  personId,
  patientId,
  included,
  excluded,
  isLoading,
}: Readonly<FoodPreferencesCardProps>) {
  if (isLoading) {
    return <FoodPreferencesCardSkeleton />;
  }

  const isEmpty = included.length === 0 && excluded.length === 0;

  const viewHistoryLink = (
    <div className="mt-auto border-neutral-200 border-t pt-3" style={{ marginTop: "1rem" }}>
      <Link
        to="/customers/$customerId/food-preferences"
        params={{ customerId: personId }}
        className="flex items-center gap-1.5 text-foreground/70 text-sm transition-colors hover:text-foreground"
      >
        <span>{m.food_preferences_view_history()}</span>
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );

  if (isEmpty) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
        <div className="flex items-start justify-end">
          <AddFoodPreferenceDialog personId={personId} patientId={patientId}>
            <Button variant="outline" size="sm">
              <PlusIcon className="size-4" data-icon="inline-start" />
              {m.food_preferences_add()}
            </Button>
          </AddFoodPreferenceDialog>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6">
          <Utensils className="size-8 text-neutral-400" />
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">{m.food_preferences_empty()}</p>
            <p className="text-foreground/65 text-xs">{m.food_preferences_empty_desc()}</p>
          </div>
        </div>
        {viewHistoryLink}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
      <AddFoodPreferenceDialog personId={personId} patientId={patientId}>
        <Button variant="outline" size="sm" className="absolute top-4 right-4 lg:top-5 lg:right-5">
          <PlusIcon className="size-4" data-icon="inline-start" />
          {m.food_preferences_add()}
        </Button>
      </AddFoodPreferenceDialog>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TagColumn
          label={m.food_preferences_avoids_label()}
          tags={excluded}
          tagClassName="border-yellow-200 bg-yellow-50 text-yellow-800"
          emptyText={m.food_preferences_none_avoided()}
        />
        <TagColumn
          label={m.food_preferences_includes_label()}
          tags={included}
          tagClassName="border-emerald-200 bg-emerald-50 text-emerald-800"
          emptyText={m.food_preferences_none_included()}
          className="sm:border-neutral-200 sm:border-l sm:pl-4"
        />
      </div>

      {viewHistoryLink}
    </div>
  );
}
