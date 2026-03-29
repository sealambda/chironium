import { useQueryClient } from "@tanstack/react-query";
import { Stethoscope } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  type ConditionItem as ApiConditionItem,
  createConditionsFromTags,
} from "@/features/customers/api/condition-api";
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

interface ConditionsCardProps {
  personId: string;
  patientId: string | null;
  items: ConditionItem[];
  isLoading?: boolean;
}

type ConditionItem = Pick<ApiConditionItem, "code">;

// ─── Helpers ─────────────────────────────────────────────────────────

function conditionLabels(items: ConditionItem[]): string[] {
  return items.map((item) => displayTextFromCodeableConcept(item.code)).filter(Boolean);
}

// ─── Add dialog ──────────────────────────────────────────────────────

interface AddConditionsDialogProps {
  personId: string;
  patientId: string | null;
  children: React.ReactNode;
}

function AddConditionsDialog({
  personId,
  patientId,
  children,
}: Readonly<AddConditionsDialogProps>) {
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
      await createConditionsFromTags(tags, patientId, selectedOrg?.id ?? "");

      await queryClient.invalidateQueries({
        queryKey: ["person", personId, "conditions"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["person", personId, "patient-detail"],
      });

      toast.success(m.condition_add_success());
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
          <DialogTitle>{m.condition_dialog_title()}</DialogTitle>
        </DialogHeader>

        <TerminologyTagInput
          label={m.condition_list_label()}
          placeholder={m.condition_field_placeholder()}
          tags={tags}
          onAdd={(tag) => setTags((prev) => [...prev, tag])}
          onRemove={(i) => setTags((prev) => prev.filter((_, idx) => idx !== i))}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="CONDITION"
          addLabel={m.common_add()}
          disabled={saving}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving || tags.length === 0}>
            {saving ? m.common_saving() : m.condition_dialog_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function ConditionsCard({
  personId,
  patientId,
  items,
  isLoading,
}: Readonly<ConditionsCardProps>) {
  if (isLoading) {
    return <CustomerDetailTagsCardSkeleton columns={1} />;
  }

  const labels = conditionLabels(items);
  const isEmpty = labels.length === 0;

  if (isEmpty) {
    return (
      <CustomerDetailEmptyCard
        header={
          <CustomerDetailEmptyCardAddRow>
            <AddConditionsDialog personId={personId} patientId={patientId}>
              <CardAddButton label={m.condition_add()} />
            </AddConditionsDialog>
          </CustomerDetailEmptyCardAddRow>
        }
        icon={Stethoscope}
        title={m.condition_empty()}
        description={m.condition_empty_desc()}
      />
    );
  }

  return (
    <div className="relative flex flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
      <AddConditionsDialog personId={personId} patientId={patientId}>
        <CardAddButton
          label={m.condition_add()}
          className="absolute top-4 right-4 lg:top-5 lg:right-5"
        />
      </AddConditionsDialog>

      <TagColumn
        label={m.condition_list_label()}
        tags={labels}
        tagClassName="border-sky-200 bg-sky-50 text-sky-900"
        emptyText={m.condition_none_listed()}
      />

      <CardHistoryLinkFooter
        customerId={personId}
        to="/customers/$customerId/conditions"
        label={m.condition_view_history()}
      />
    </div>
  );
}
