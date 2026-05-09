import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import type { AllergyIntoleranceItem } from "@/features/customers/api/allergy-intolerance-api";
import { AllergyDetailDialog } from "@/features/customers/ui/detail/allergy-detail-dialog";
import { AllergyPill } from "@/features/customers/ui/detail/allergy-pill";
import { AllergyRemoveDialog } from "@/features/customers/ui/detail/allergy-remove-dialog";
import { TagsCardColumn, TagsCardPillList } from "@/features/customers/ui/detail/tags-card-content";
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
        <TagsCardColumn
          title={m.allergy_intolerance_allergies_label()}
          isEmpty={allergies.length === 0}
          emptyText={m.allergy_intolerance_none_allergies()}
          className="pr-3"
        >
          <TagsCardPillList>
            {allergies.map((item) => (
              <AllergyPill
                key={item.id}
                allergyType={item.type as "ALLERGY" | "INTOLERANCE"}
                clinicalStatus={item.clinicalStatus ?? undefined}
                onClick={canInteract ? () => setEditingItem(item) : undefined}
              >
                {nameOf(item)}
              </AllergyPill>
            ))}
          </TagsCardPillList>
        </TagsCardColumn>
        <TagsCardColumn
          title={m.allergy_intolerance_intolerances_label()}
          isEmpty={intolerances.length === 0}
          emptyText={m.allergy_intolerance_none_intolerances()}
          className="pl-3"
        >
          <TagsCardPillList>
            {intolerances.map((item) => (
              <AllergyPill
                key={item.id}
                allergyType={item.type as "ALLERGY" | "INTOLERANCE"}
                clinicalStatus={item.clinicalStatus ?? undefined}
                onClick={canInteract ? () => setEditingItem(item) : undefined}
              >
                {nameOf(item)}
              </AllergyPill>
            ))}
          </TagsCardPillList>
        </TagsCardColumn>
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
