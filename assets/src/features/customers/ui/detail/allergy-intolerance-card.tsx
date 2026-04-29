import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import type { AllergyIntoleranceItem } from "@/features/customers/api/allergy-intolerance-api";
import { AllergyDetailDialog } from "@/features/customers/ui/detail/allergy-detail-dialog";
import { AllergyPill } from "@/features/customers/ui/detail/allergy-pill";
import { AllergyRemoveDialog } from "@/features/customers/ui/detail/allergy-remove-dialog";
import { TagsCardShell } from "@/features/customers/ui/detail/tags-card-shell";
import * as m from "@/paraglide/messages";

interface AllergyIntoleranceCardProps {
  readonly items: AllergyIntoleranceItem[];
  readonly isLoading?: boolean;
  readonly compact?: boolean;
  readonly personId?: string;
  readonly patientId?: string | null;
  readonly organizationId?: string;
}

const isActive = (item: AllergyIntoleranceItem) =>
  item.verificationStatus !== "ENTERED_IN_ERROR" && item.verificationStatus !== "REFUTED";

const nameOf = (item: AllergyIntoleranceItem): string =>
  item.code?.text ?? item.code?.coding?.[0]?.display ?? "";

interface AllergyColumnProps {
  readonly label: string;
  readonly items: readonly AllergyIntoleranceItem[];
  readonly emptyText: string;
  readonly className?: string;
  readonly onEdit?: (item: AllergyIntoleranceItem) => void;
}

function AllergyColumn({ label, items, emptyText, className, onEdit }: AllergyColumnProps) {
  return (
    <div className={className}>
      <p className="mb-2 font-semibold text-foreground/60 text-xs uppercase tracking-widest">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <AllergyPill
              key={item.id}
              allergyType={item.type as "ALLERGY" | "INTOLERANCE"}
              clinicalStatus={item.clinicalStatus ?? undefined}
              onClick={onEdit ? () => onEdit(item) : undefined}
            >
              {nameOf(item)}
            </AllergyPill>
          ))}
        </div>
      )}
    </div>
  );
}

export function AllergyIntoleranceCard({
  items,
  isLoading,
  compact,
  personId,
  patientId,
  organizationId,
}: AllergyIntoleranceCardProps) {
  const [editingItem, setEditingItem] = useState<AllergyIntoleranceItem | null>(null);
  const [removingItem, setRemovingItem] = useState<AllergyIntoleranceItem | null>(null);

  const canInteract = Boolean(personId && organizationId);
  const safePersonId = personId ?? "";
  const safeOrgId = organizationId ?? "";

  const active = items.filter(isActive);
  const allergies = active.filter((item) => item.type === "ALLERGY");
  const intolerances = active.filter((item) => item.type === "INTOLERANCE");

  return (
    <>
      <TagsCardShell
        isLoading={isLoading}
        isEmpty={active.length === 0}
        emptyIcon={AlertTriangle}
        emptyTitle={m.allergy_intolerance_empty()}
        emptyDescription={m.allergy_intolerance_empty_desc()}
        compact={compact}
        columns={2}
      >
        <AllergyColumn
          label={m.allergy_intolerance_allergies_label()}
          items={allergies}
          emptyText={m.allergy_intolerance_none_allergies()}
          className="pr-3"
          onEdit={canInteract ? setEditingItem : undefined}
        />
        <AllergyColumn
          label={m.allergy_intolerance_intolerances_label()}
          items={intolerances}
          emptyText={m.allergy_intolerance_none_intolerances()}
          className="pl-3"
          onEdit={canInteract ? setEditingItem : undefined}
        />
      </TagsCardShell>

      {canInteract && (
        <>
          <AllergyDetailDialog
            mode="edit"
            item={editingItem ?? undefined}
            personId={safePersonId}
            patientId={patientId ?? null}
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
            <AllergyRemoveDialog
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
