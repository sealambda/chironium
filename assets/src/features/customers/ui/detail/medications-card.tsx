import { useQueryClient } from "@tanstack/react-query";
import { Pill } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  type MedicationItem as ApiMedicationItem,
  createMedicationsFromTags,
} from "@/features/customers/api/medications-api";
import { CardHistoryLinkFooter } from "@/features/customers/ui/detail/card-footer";
import {
  CustomerDetailEmptyCard,
  CustomerDetailEmptyCardAddRow,
} from "@/features/customers/ui/detail/customer-detail-empty-card";
import { CustomerDetailTagsCardSkeleton } from "@/features/customers/ui/detail/customer-detail-tags-card-skeleton";
import { TagColumn } from "@/features/customers/ui/detail/tag-column";
import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";
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
import { TerminologyTagInput } from "@/shared/ui/terminology-tag-input";

// ─── Props ───────────────────────────────────────────────────────────

interface MedicationsCardProps {
  personId: string;
  patientId: string | null;
  items: MedicationsCardItem[];
  isLoading?: boolean;
}

type MedicationsCardItem = Pick<ApiMedicationItem, "code">;

// ─── Helpers ─────────────────────────────────────────────────────────

function medicationsLabels(items: MedicationsCardItem[]): string[] {
  return items.map((item) => displayTextFromCodeableConcept(item.code)).filter(Boolean);
}

// ─── Add dialog ──────────────────────────────────────────────────────

interface AddMedicationsDialogProps {
  personId: string;
  patientId: string | null;
  children: React.ReactNode;
}

function AddMedicationsDialog({
  personId,
  patientId,
  children,
}: Readonly<AddMedicationsDialogProps>) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<TerminologyTag[]>([]);
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const resetForm = () => {
    setTags([]);
  };

  const handleSubmit = async () => {
    if (tags.length === 0 || !patientId) {
      if (!patientId) {
        toast.error(m.onboarding_error());
      }
      return;
    }

    setSaving(true);
    try {
      await createMedicationsFromTags(tags, patientId, selectedOrg?.id ?? "");

      await queryClient.invalidateQueries({
        queryKey: ["person", personId, "medications"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["person", personId, "patient-detail"],
      });

      toast.success(m.medication_add_success());
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
          <DialogTitle>{m.medication_dialog_title()}</DialogTitle>
        </DialogHeader>

        <TerminologyTagInput
          label={m.medication_list_label()}
          placeholder={m.medication_field_placeholder()}
          tags={tags}
          onAdd={(tag) => setTags((prev) => [...prev, tag])}
          onRemove={(i) => setTags((prev) => prev.filter((_, idx) => idx !== i))}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="MEDICATION"
          addLabel={m.common_add()}
          disabled={saving}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving || tags.length === 0}>
            {saving ? m.common_saving() : m.medication_dialog_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function MedicationsCard({
  personId,
  patientId,
  items,
  isLoading,
}: Readonly<MedicationsCardProps>) {
  if (isLoading) {
    return <CustomerDetailTagsCardSkeleton columns={1} />;
  }

  const labels = medicationsLabels(items);
  const isEmpty = labels.length === 0;

  if (isEmpty) {
    return (
      <CustomerDetailEmptyCard
        header={
          <CustomerDetailEmptyCardAddRow>
            <AddMedicationsDialog personId={personId} patientId={patientId}>
              <CardAddButton label={m.medication_add()} />
            </AddMedicationsDialog>
          </CustomerDetailEmptyCardAddRow>
        }
        icon={Pill}
        title={m.medication_empty()}
        description={m.medication_empty_desc()}
      />
    );
  }

  return (
    <div className="relative flex flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
      <AddMedicationsDialog personId={personId} patientId={patientId}>
        <CardAddButton
          label={m.medication_add()}
          className="absolute top-4 right-4 lg:top-5 lg:right-5"
        />
      </AddMedicationsDialog>

      <TagColumn
        label={m.medication_list_label()}
        tags={labels}
        tagClassName="border-violet-200 bg-violet-50 text-violet-900"
        emptyText={m.medication_none_listed()}
      />

      <CardHistoryLinkFooter
        customerId={personId}
        to="/customers/$customerId/medications"
        label={m.medication_view_history()}
      />
    </div>
  );
}
