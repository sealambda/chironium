import { Pill } from "lucide-react";
import { useState } from "react";

import type { MedicationRequestItem } from "@/features/customers/api/medication-requests-api";
import type { MedicationItem } from "@/features/customers/api/medications-api";
import { MedicationDetailDialog } from "@/features/customers/ui/detail/medication-detail-dialog";
import { MedicationPill } from "@/features/customers/ui/detail/medication-pill";
import { MedicationRemoveDialog } from "@/features/customers/ui/detail/medication-remove-dialog";
import { PrescriptionDetailDialog } from "@/features/customers/ui/detail/prescription-detail-dialog";
import { PrescriptionRemoveDialog } from "@/features/customers/ui/detail/prescription-remove-dialog";
import { TagsCardColumn, TagsCardPillList } from "@/features/customers/ui/detail/tags-card-content";
import { TagsCardShell } from "@/features/customers/ui/detail/tags-card-shell";
import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";
import * as m from "@/paraglide/messages";

interface MedicationsSupplementsCardProps {
  /** Medications and supplements on the patient profile (MedicationStatement). */
  readonly medications: MedicationItem[];
  /** Medications and supplements recommended in-app (MedicationRequest). */
  readonly medicationRequests: MedicationRequestItem[];
  readonly isLoading?: boolean;
  readonly compact?: boolean;
  readonly personId?: string;
  readonly organizationId?: string;
}

interface RecommendedEntry {
  readonly id: string;
  readonly label: string;
  readonly isPast: boolean;
  readonly item: MedicationRequestItem;
}

interface OtherEntry {
  readonly id: string;
  readonly label: string;
  readonly isPast: boolean;
  readonly item: MedicationItem;
}

function nameOfRequest(item: MedicationRequestItem): string {
  return displayTextFromCodeableConcept(item.medication) ?? "";
}

function nameOfMedication(item: MedicationItem): string {
  return displayTextFromCodeableConcept(item.medication) ?? "";
}

function buildRecommended(items: MedicationRequestItem[]): RecommendedEntry[] {
  return items
    .filter((item) => item.status !== "ENTERED_IN_ERROR")
    .map((item) => ({
      id: item.id,
      label: nameOfRequest(item),
      isPast: item.status !== "ACTIVE",
      item,
    }))
    .filter((entry) => entry.label);
}

function buildOther(items: MedicationItem[]): OtherEntry[] {
  return items
    .filter((item) => item.status !== "ENTERED_IN_ERROR")
    .map((item) => ({
      id: item.id,
      label: nameOfMedication(item),
      isPast: Boolean(item.effectivePeriod?.end),
      item,
    }))
    .filter((entry) => entry.label);
}

/**
 * Single card listing in-app recommendations (MedicationRequest) and everything
 * else on the patient profile (MedicationStatement). Each pill opens the dialog
 * matching its source — the two resources stay distinct underneath.
 */
export function MedicationsSupplementsCard({
  medications,
  medicationRequests,
  isLoading,
  compact,
  personId,
  organizationId,
}: MedicationsSupplementsCardProps) {
  const [editingMedication, setEditingMedication] = useState<MedicationItem | null>(null);
  const [editingRecommendation, setEditingRecommendation] = useState<MedicationRequestItem | null>(
    null,
  );
  const [removingMedication, setRemovingMedication] = useState<MedicationItem | null>(null);
  const [removingRecommendation, setRemovingRecommendation] =
    useState<MedicationRequestItem | null>(null);

  const canInteract = Boolean(personId && organizationId);
  const safePersonId = personId ?? "";
  const safeOrgId = organizationId ?? "";

  const recommended = buildRecommended(medicationRequests);
  const other = buildOther(medications);
  const total = recommended.length + other.length;

  return (
    <>
      <TagsCardShell
        isLoading={isLoading}
        isEmpty={total === 0}
        emptyIcon={Pill}
        emptyTitle={m.medication_empty()}
        emptyDescription={m.medication_empty_desc()}
        compact={compact}
        columns={2}
      >
        <TagsCardColumn
          title={m.meds_section_recommended()}
          isEmpty={recommended.length === 0}
          emptyText={m.meds_section_recommended_none()}
          className="pr-3"
        >
          <TagsCardPillList>
            {recommended.map((entry) => (
              <MedicationPill
                key={entry.id}
                variant="recommended"
                isPast={entry.isPast}
                onClick={canInteract ? () => setEditingRecommendation(entry.item) : undefined}
              >
                {entry.label}
              </MedicationPill>
            ))}
          </TagsCardPillList>
        </TagsCardColumn>
        <TagsCardColumn
          title={m.meds_section_other()}
          isEmpty={other.length === 0}
          emptyText={m.meds_section_other_none()}
          className="pl-3"
        >
          <TagsCardPillList>
            {other.map((entry) => (
              <MedicationPill
                key={entry.id}
                variant="other"
                isPast={entry.isPast}
                onClick={canInteract ? () => setEditingMedication(entry.item) : undefined}
              >
                {entry.label}
              </MedicationPill>
            ))}
          </TagsCardPillList>
        </TagsCardColumn>
      </TagsCardShell>

      {canInteract && (
        <>
          <PrescriptionDetailDialog
            mode="edit"
            item={editingRecommendation ?? undefined}
            personId={safePersonId}
            organizationId={safeOrgId}
            open={editingRecommendation !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingRecommendation(null);
              }
            }}
            onRemoveClick={() => {
              setRemovingRecommendation(editingRecommendation);
              setEditingRecommendation(null);
            }}
          />

          <MedicationDetailDialog
            mode="edit"
            item={editingMedication ?? undefined}
            personId={safePersonId}
            organizationId={safeOrgId}
            open={editingMedication !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingMedication(null);
              }
            }}
            onRemoveClick={() => {
              setRemovingMedication(editingMedication);
              setEditingMedication(null);
            }}
          />

          {removingRecommendation !== null && (
            <PrescriptionRemoveDialog
              id={removingRecommendation.id}
              name={nameOfRequest(removingRecommendation)}
              personId={safePersonId}
              organizationId={safeOrgId}
              open={removingRecommendation !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setRemovingRecommendation(null);
                }
              }}
            />
          )}

          {removingMedication !== null && (
            <MedicationRemoveDialog
              id={removingMedication.id}
              name={nameOfMedication(removingMedication)}
              personId={safePersonId}
              organizationId={safeOrgId}
              open={removingMedication !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setRemovingMedication(null);
                }
              }}
            />
          )}
        </>
      )}
    </>
  );
}
