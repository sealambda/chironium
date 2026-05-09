import { Pill } from "lucide-react";
import { useState } from "react";

import type { MedicationItem } from "@/features/customers/api/medications-api";
import { MedicationDetailDialog } from "@/features/customers/ui/detail/medication-detail-dialog";
import { MedicationPill } from "@/features/customers/ui/detail/medication-pill";
import { MedicationRemoveDialog } from "@/features/customers/ui/detail/medication-remove-dialog";
import { TagsCardColumn, TagsCardPillList } from "@/features/customers/ui/detail/tags-card-content";
import { TagsCardShell } from "@/features/customers/ui/detail/tags-card-shell";
import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";
import * as m from "@/paraglide/messages";

interface MedicationsCardProps {
  readonly items: MedicationItem[];
  readonly isLoading?: boolean;
  readonly compact?: boolean;
  readonly personId?: string;
  readonly organizationId?: string;
}

/** Active items are those not soft-removed via status. */
function filterActive(items: MedicationItem[]): MedicationItem[] {
  return items.filter((item) => item.status !== "ENTERED_IN_ERROR");
}

function nameOf(item: MedicationItem): string {
  return displayTextFromCodeableConcept(item.medication) ?? "";
}

function isPastUse(item: MedicationItem): boolean {
  return Boolean(item.effectivePeriod?.end);
}

export function MedicationsCard({
  items,
  isLoading,
  compact,
  personId,
  organizationId,
}: MedicationsCardProps) {
  const [editingItem, setEditingItem] = useState<MedicationItem | null>(null);
  const [removingItem, setRemovingItem] = useState<MedicationItem | null>(null);

  const canInteract = Boolean(personId && organizationId);
  const safePersonId = personId ?? "";
  const safeOrgId = organizationId ?? "";

  const active = filterActive(items);
  const entries = active
    .map((item) => ({ item, label: nameOf(item) }))
    .filter((entry) => entry.label);

  return (
    <>
      <TagsCardShell
        isLoading={isLoading}
        isEmpty={entries.length === 0}
        emptyIcon={Pill}
        emptyTitle={m.medication_empty()}
        emptyDescription={m.medication_empty_desc()}
        compact={compact}
      >
        <TagsCardColumn title={m.medication_list_label()} isEmpty={false} emptyText="">
          <TagsCardPillList>
            {entries.map(({ item, label }) => (
              <MedicationPill
                key={item.id}
                isPast={isPastUse(item)}
                onClick={canInteract ? () => setEditingItem(item) : undefined}
              >
                {label}
              </MedicationPill>
            ))}
          </TagsCardPillList>
        </TagsCardColumn>
      </TagsCardShell>

      {canInteract && (
        <>
          <MedicationDetailDialog
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
            <MedicationRemoveDialog
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
