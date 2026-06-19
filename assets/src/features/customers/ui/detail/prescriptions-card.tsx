import { format } from "date-fns";
import { Pill } from "lucide-react";
import { useState } from "react";

import type { MedicationRequestItem } from "@/features/customers/api/medication-requests-api";
import { MedicationPill } from "@/features/customers/ui/detail/medication-pill";
import { PrescriptionDetailDialog } from "@/features/customers/ui/detail/prescription-detail-dialog";
import { PrescriptionRemoveDialog } from "@/features/customers/ui/detail/prescription-remove-dialog";
import { TagsCardColumn } from "@/features/customers/ui/detail/tags-card-content";
import { TagsCardShell } from "@/features/customers/ui/detail/tags-card-shell";
import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";
import * as m from "@/paraglide/messages";
import { getDateLocale } from "@/shared/utils/date-locale";

interface PrescriptionsCardProps {
  readonly items: MedicationRequestItem[];
  readonly isLoading?: boolean;
  readonly compact?: boolean;
  readonly personId?: string;
  readonly organizationId?: string;
}

/** Active items are those not soft-removed via status. */
function filterActive(items: MedicationRequestItem[]): MedicationRequestItem[] {
  return items.filter((item) => item.status !== "ENTERED_IN_ERROR");
}

function nameOf(item: MedicationRequestItem): string {
  return displayTextFromCodeableConcept(item.medication) ?? "";
}

/** Treat anything past the active state as discontinued, mirroring medications. */
function isInactive(item: MedicationRequestItem): boolean {
  return item.status !== "ACTIVE";
}

/** "Dr. Rossi · 12 Jun 2026" — whichever parts are present. */
function prescriberLabel(item: MedicationRequestItem): string {
  const name = item.requester?.name?.[0];
  const prescriber = name?.text ?? [name?.given, name?.family].filter(Boolean).join(" ").trim();
  const date = item.authoredOn
    ? format(new Date(item.authoredOn), "d MMM yyyy", { locale: getDateLocale() })
    : "";
  return [prescriber, date].filter(Boolean).join(" · ");
}

export function PrescriptionsCard({
  items,
  isLoading,
  compact,
  personId,
  organizationId,
}: PrescriptionsCardProps) {
  const [editingItem, setEditingItem] = useState<MedicationRequestItem | null>(null);
  const [removingItem, setRemovingItem] = useState<MedicationRequestItem | null>(null);

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
        emptyTitle={m.prescription_empty()}
        emptyDescription={m.prescription_empty_desc()}
        compact={compact}
      >
        <TagsCardColumn title={m.prescription_list_label()} isEmpty={false} emptyText="">
          <div className="flex flex-col gap-3">
            {entries.map(({ item, label }) => {
              const subtitle = prescriberLabel(item);
              return (
                <div key={item.id} className="flex flex-col gap-1">
                  <div className="flex flex-wrap gap-1.5">
                    <MedicationPill
                      isPast={isInactive(item)}
                      onClick={canInteract ? () => setEditingItem(item) : undefined}
                    >
                      {label}
                    </MedicationPill>
                  </div>
                  {subtitle ? (
                    <span className="pl-1 text-muted-foreground text-xs">{subtitle}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </TagsCardColumn>
      </TagsCardShell>

      {canInteract && (
        <>
          <PrescriptionDetailDialog
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
            <PrescriptionRemoveDialog
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
