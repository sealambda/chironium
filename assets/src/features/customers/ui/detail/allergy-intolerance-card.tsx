import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  type AllergyIntoleranceItem as ApiAllergyIntoleranceItem,
  createAllergiesAndIntolerances,
} from "@/features/customers/api/allergy-intolerance-api";
import { CardHistoryLinkFooter } from "@/features/customers/ui/detail/card-footer";
import {
  CustomerDetailEmptyCard,
  CustomerDetailEmptyCardAddRow,
} from "@/features/customers/ui/detail/customer-detail-empty-card";
import { TagColumn } from "@/features/customers/ui/detail/tag-column";
import { useOrg } from "@/features/org/hooks/use-org";
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

// ─── Props ───────────────────────────────────────────────────────────

interface AllergyIntoleranceCardProps {
  personId: string;
  patientId: string | null;
  items: AllergyIntoleranceItem[];
  isLoading?: boolean;
}

type AllergyIntoleranceItem = Pick<ApiAllergyIntoleranceItem, "type" | "code">;

// ─── Helpers ─────────────────────────────────────────────────────────

function parseItemTags(items: AllergyIntoleranceItem[], type: string): string[] {
  return items
    .filter((item) => item.type === type)
    .map((item) => item.code?.text ?? item.code?.coding?.[0]?.display ?? "")
    .filter(Boolean);
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
  const [allergies, setAllergies] = useState<TerminologyTag[]>([]);
  const [intolerances, setIntolerances] = useState<TerminologyTag[]>([]);
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
          <TerminologyTagInput
            label={m.allergy_intolerance_allergies_label()}
            placeholder={m.field_allergies_placeholder()}
            tags={allergies}
            onAdd={(tag) => setAllergies((prev) => [...prev, tag])}
            onRemove={(i) => setAllergies((prev) => prev.filter((_, idx) => idx !== i))}
            organizationId={selectedOrg?.id ?? ""}
            conceptContext="ALLERGY_INTOLERANCE"
            addLabel={m.common_add()}
            disabled={saving}
          />
          <TerminologyTagInput
            label={m.allergy_intolerance_intolerances_label()}
            placeholder={m.field_intolerances_placeholder()}
            tags={intolerances}
            onAdd={(tag) => setIntolerances((prev) => [...prev, tag])}
            onRemove={(i) => setIntolerances((prev) => prev.filter((_, idx) => idx !== i))}
            organizationId={selectedOrg?.id ?? ""}
            conceptContext="ALLERGY_INTOLERANCE"
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
    <div className="flex flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
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

  if (isEmpty) {
    return (
      <CustomerDetailEmptyCard
        header={
          <CustomerDetailEmptyCardAddRow>
            <AddAllergyIntoleranceDialog personId={personId} patientId={patientId}>
              <CardAddButton label={m.allergy_intolerance_add()} />
            </AddAllergyIntoleranceDialog>
          </CustomerDetailEmptyCardAddRow>
        }
        icon={AlertTriangle}
        title={m.allergy_intolerance_empty()}
        description={m.allergy_intolerance_empty_desc()}
      />
    );
  }

  return (
    <div className="relative flex flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
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
          className="sm:border-border sm:border-l sm:pl-4"
        />
      </div>

      <CardHistoryLinkFooter
        customerId={personId}
        to="/customers/$customerId/allergies"
        label={m.allergy_intolerance_view_history()}
      />
    </div>
  );
}
