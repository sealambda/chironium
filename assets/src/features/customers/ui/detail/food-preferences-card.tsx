import { useQueryClient } from "@tanstack/react-query";
import { Utensils } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createFoodObservations } from "@/features/customers/api/food-preferences-api";
import { CardHistoryLinkFooter } from "@/features/customers/ui/detail/card-footer";
import {
  CustomerDetailEmptyCard,
  CustomerDetailEmptyCardAddRow,
} from "@/features/customers/ui/detail/customer-detail-empty-card";
import { TagColumn } from "@/features/customers/ui/detail/tag-column";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
import type { TerminologyTag } from "@/shared/types/terminology";
import { Button } from "@/shared/ui/button";
import { CardAddButton } from "@/shared/ui/card-add-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import { TerminologyTagInput } from "@/shared/ui/terminology-tag-input";
import { personQueryKeys } from "@/shared/utils/query-keys";

// ─── Props ───────────────────────────────────────────────────────────

interface FoodPreferencesCardProps {
  personId: string;
  patientId: string | null;
  included: string[];
  excluded: string[];
  isLoading?: boolean;
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
  const [included, setIncluded] = useState<TerminologyTag[]>([]);
  const [excluded, setExcluded] = useState<TerminologyTag[]>([]);
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
        toast.error(m.onboarding_error());
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
        user?.name ?? "",
      );

      await queryClient.invalidateQueries({
        queryKey: personQueryKeys.foodPreferencesScope(personId),
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
          <TerminologyTagInput
            label={m.food_preferences_includes_label()}
            placeholder={m.field_food_included_placeholder()}
            tags={included}
            onAdd={(tag) => setIncluded((prev) => [...prev, tag])}
            onRemove={(i) => setIncluded((prev) => prev.filter((_, idx) => idx !== i))}
            organizationId={selectedOrg?.id ?? ""}
            conceptContext="FOOD"
            addLabel={m.common_add()}
            disabled={saving}
          />
          <TerminologyTagInput
            label={m.food_preferences_avoids_label()}
            placeholder={m.field_food_excluded_placeholder()}
            tags={excluded}
            onAdd={(tag) => setExcluded((prev) => [...prev, tag])}
            onRemove={(i) => setExcluded((prev) => prev.filter((_, idx) => idx !== i))}
            organizationId={selectedOrg?.id ?? ""}
            conceptContext="FOOD"
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
    <div className="flex flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
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

  if (isEmpty) {
    return (
      <CustomerDetailEmptyCard
        header={
          <CustomerDetailEmptyCardAddRow>
            <AddFoodPreferenceDialog personId={personId} patientId={patientId}>
              <CardAddButton label={m.food_preferences_add()} />
            </AddFoodPreferenceDialog>
          </CustomerDetailEmptyCardAddRow>
        }
        icon={Utensils}
        title={m.food_preferences_empty()}
        description={m.food_preferences_empty_desc()}
      />
    );
  }

  return (
    <div className="relative flex flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
      <AddFoodPreferenceDialog personId={personId} patientId={patientId}>
        <CardAddButton
          label={m.food_preferences_add()}
          className="absolute top-4 right-4 lg:top-5 lg:right-5"
        />
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
          className="sm:border-border sm:border-l sm:pl-4"
        />
      </div>

      <CardHistoryLinkFooter
        customerId={personId}
        to="/customers/$customerId/food-preferences"
        label={m.food_preferences_view_history()}
      />
    </div>
  );
}
