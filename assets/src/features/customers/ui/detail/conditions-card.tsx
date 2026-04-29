import { Stethoscope } from "lucide-react";
import { useState } from "react";

import type { ConditionItem } from "@/features/customers/api/condition-api";
import { ConditionDetailDialog } from "@/features/customers/ui/detail/condition-detail-dialog";
import { ConditionPill } from "@/features/customers/ui/detail/condition-pill";
import { ConditionRemoveDialog } from "@/features/customers/ui/detail/condition-remove-dialog";
import { TagsCardShell } from "@/features/customers/ui/detail/tags-card-shell";
import { formatFhirClinicalStatusLabel } from "@/features/customers/utils/clinical-history-display";
import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";
import * as m from "@/paraglide/messages";

interface ConditionsCardProps {
  readonly items: ConditionItem[];
  readonly isLoading?: boolean;
  readonly compact?: boolean;
  readonly personId?: string;
  readonly organizationId?: string;
}

/** Active items are those not soft-removed via verificationStatus. */
function filterActive(items: ConditionItem[]): ConditionItem[] {
  return items.filter(
    (item) =>
      item.verificationStatus !== "ENTERED_IN_ERROR" && item.verificationStatus !== "REFUTED",
  );
}

function nameOf(item: ConditionItem): string {
  return displayTextFromCodeableConcept(item.code) ?? "";
}

export function ConditionsCard({
  items,
  isLoading,
  compact,
  personId,
  organizationId,
}: ConditionsCardProps) {
  const [editingItem, setEditingItem] = useState<ConditionItem | null>(null);
  const [removingItem, setRemovingItem] = useState<ConditionItem | null>(null);

  const canInteract = Boolean(personId && organizationId);
  const safePersonId = personId ?? "";
  const safeOrgId = organizationId ?? "";

  const active = filterActive(items);
  const conditions = active
    .map((item) => ({ item, label: nameOf(item) }))
    .filter((entry) => entry.label);

  return (
    <>
      <TagsCardShell
        isLoading={isLoading}
        isEmpty={conditions.length === 0}
        emptyIcon={Stethoscope}
        emptyTitle={m.condition_empty()}
        emptyDescription={m.condition_empty_desc()}
        compact={compact}
      >
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-foreground/70 text-sm uppercase tracking-widest">
            {m.condition_list_label()}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {conditions.map(({ item, label }) => {
              const statusLabel = item.clinicalStatus
                ? formatFhirClinicalStatusLabel(item.clinicalStatus)
                : null;

              return (
                <ConditionPill
                  key={item.id}
                  clinicalStatus={item.clinicalStatus}
                  statusLabel={statusLabel}
                  onClick={canInteract ? () => setEditingItem(item) : undefined}
                >
                  {label}
                </ConditionPill>
              );
            })}
          </div>
        </div>
      </TagsCardShell>

      {canInteract && (
        <>
          <ConditionDetailDialog
            mode="edit"
            item={editingItem ?? undefined}
            personId={safePersonId}
            organizationId={safeOrgId}
            open={editingItem !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingItem(null);
              }
            }}
            onRemoveClick={() => {
              setRemovingItem(editingItem);
              setEditingItem(null);
            }}
          />

          {removingItem !== null && (
            <ConditionRemoveDialog
              id={removingItem.id}
              name={nameOf(removingItem)}
              personId={safePersonId}
              organizationId={safeOrgId}
              open={removingItem !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setRemovingItem(null);
                }
              }}
            />
          )}
        </>
      )}
    </>
  );
}
