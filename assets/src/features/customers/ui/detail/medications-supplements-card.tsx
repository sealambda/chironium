import { format } from "date-fns";
import { Pill } from "lucide-react";
import { useState } from "react";

import type { MedicationRequestItem } from "@/features/customers/api/medication-requests-api";
import type { MedicationItem } from "@/features/customers/api/medications-api";
import { MedicationDetailDialog } from "@/features/customers/ui/detail/medication-detail-dialog";
import { MedicationPill } from "@/features/customers/ui/detail/medication-pill";
import { MedicationRemoveDialog } from "@/features/customers/ui/detail/medication-remove-dialog";
import { PrescriptionDetailDialog } from "@/features/customers/ui/detail/prescription-detail-dialog";
import { PrescriptionRemoveDialog } from "@/features/customers/ui/detail/prescription-remove-dialog";
import { TagsCardTitle } from "@/features/customers/ui/detail/tags-card-content";
import { TagsCardShell } from "@/features/customers/ui/detail/tags-card-shell";
import { formatFhirCourseOfTherapyLabel } from "@/features/customers/utils/clinical-history-display";
import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { getDateLocale } from "@/shared/utils/date-locale";

interface MedicationsSupplementsCardProps {
  /** Self-reported medications & supplements (MedicationStatement). */
  readonly medications: MedicationItem[];
  /** Practitioner-recommended supplements (MedicationRequest). */
  readonly medicationRequests: MedicationRequestItem[];
  readonly isLoading?: boolean;
  readonly compact?: boolean;
  readonly personId?: string;
  readonly organizationId?: string;
}

/** Whether the user takes this on their own, or we recommended it. */
type SourceFilter = "all" | "recommended" | "self_reported";

interface RecommendedEntry {
  readonly source: "recommended";
  readonly id: string;
  readonly label: string;
  readonly dosage: string;
  readonly subtitle: string;
  readonly isPast: boolean;
  readonly item: MedicationRequestItem;
}

interface SelfReportedEntry {
  readonly source: "self_reported";
  readonly id: string;
  readonly label: string;
  readonly isPast: boolean;
  readonly item: MedicationItem;
}

type Entry = RecommendedEntry | SelfReportedEntry;

function nameOfRequest(item: MedicationRequestItem): string {
  return displayTextFromCodeableConcept(item.medication) ?? "";
}

function nameOfMedication(item: MedicationItem): string {
  return displayTextFromCodeableConcept(item.medication) ?? "";
}

/** "Dr. Rossi · 12 Jun 2026 · Continuous · 2 refills" — whichever parts exist. */
function prescriberLabel(item: MedicationRequestItem): string {
  const name = item.requester?.name?.[0];
  const prescriber = name?.text ?? [name?.given, name?.family].filter(Boolean).join(" ").trim();
  const date = item.authoredOn
    ? format(new Date(item.authoredOn), "d MMM yyyy", { locale: getDateLocale() })
    : "";
  const course = item.courseOfTherapyType
    ? formatFhirCourseOfTherapyLabel(item.courseOfTherapyType)
    : "";
  const refills = item.dispenseRequest?.numberOfRepeatsAllowed;
  const refillsLabel =
    refills != null && refills > 0 ? m.prescription_refills_count({ count: refills }) : "";
  return [prescriber, date, course, refillsLabel].filter(Boolean).join(" · ");
}

/** Free-text dosage instructions, if any. */
function dosageOf(item: MedicationRequestItem): string {
  return item.dosageInstruction?.[0]?.text?.trim() ?? "";
}

/** Recommendations past their active state read as discontinued, mirroring medications. */
function buildRecommended(items: MedicationRequestItem[]): RecommendedEntry[] {
  return items
    .filter((item) => item.status !== "ENTERED_IN_ERROR")
    .map((item) => ({
      source: "recommended" as const,
      id: item.id,
      label: nameOfRequest(item),
      dosage: dosageOf(item),
      subtitle: prescriberLabel(item),
      isPast: item.status !== "ACTIVE",
      item,
    }))
    .filter((entry) => entry.label);
}

function buildSelfReported(items: MedicationItem[]): SelfReportedEntry[] {
  return items
    .filter((item) => item.status !== "ENTERED_IN_ERROR")
    .map((item) => ({
      source: "self_reported" as const,
      id: item.id,
      label: nameOfMedication(item),
      isPast: Boolean(item.effectivePeriod?.end),
      item,
    }))
    .filter((entry) => entry.label);
}

interface EntryRowProps {
  readonly entry: Entry;
  readonly showSourceBadge: boolean;
  readonly onEdit?: () => void;
}

function EntryRow({ entry, showSourceBadge, onEdit }: EntryRowProps) {
  const dosage = entry.source === "recommended" ? entry.dosage : "";
  const subtitle = entry.source === "recommended" ? entry.subtitle : "";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <MedicationPill isPast={entry.isPast} onClick={onEdit}>
          {entry.label}
        </MedicationPill>
        {showSourceBadge ? (
          <Badge variant={entry.source === "recommended" ? "info" : "secondary"}>
            {entry.source === "recommended"
              ? m.meds_filter_practitioner()
              : m.meds_filter_self_reported()}
          </Badge>
        ) : null}
      </div>
      {dosage ? <span className="pl-1 text-foreground/80 text-xs">{dosage}</span> : null}
      {subtitle ? <span className="pl-1 text-muted-foreground text-xs">{subtitle}</span> : null}
    </div>
  );
}

/**
 * Single card listing both what we recommended (MedicationRequest) and what the
 * patient takes on their own (MedicationStatement), filterable by source. Each
 * pill opens the dialog matching its source — the two resources stay distinct
 * underneath; only the presentation is merged.
 */
export function MedicationsSupplementsCard({
  medications,
  medicationRequests,
  isLoading,
  compact,
  personId,
  organizationId,
}: MedicationsSupplementsCardProps) {
  const [filter, setFilter] = useState<SourceFilter>("all");
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
  const selfReported = buildSelfReported(medications);
  const total = recommended.length + selfReported.length;

  // The filter only earns its place when both buckets have entries; otherwise
  // every entry is the same source and the toggle is noise.
  const showFilter = recommended.length > 0 && selfReported.length > 0;
  const effectiveFilter = showFilter ? filter : "all";

  const visible: Entry[] = [
    ...(effectiveFilter === "self_reported" ? [] : recommended),
    ...(effectiveFilter === "recommended" ? [] : selfReported),
  ];

  // Source badges only carry signal in the mixed "all" view.
  const showSourceBadge = showFilter && effectiveFilter === "all";

  return (
    <>
      <TagsCardShell
        isLoading={isLoading}
        isEmpty={total === 0}
        emptyIcon={Pill}
        emptyTitle={m.medication_empty()}
        emptyDescription={m.medication_empty_desc()}
        compact={compact}
      >
        <div className="flex flex-col gap-3">
          <TagsCardTitle>{m.medication_list_label()}</TagsCardTitle>
          {showFilter ? (
            <ToggleGroup
              size="sm"
              value={filter}
              onValueChange={(value) => setFilter(value as SourceFilter)}
            >
              <ToggleGroupItem value="all">{m.meds_filter_all()}</ToggleGroupItem>
              <ToggleGroupItem value="recommended">{m.meds_filter_practitioner()}</ToggleGroupItem>
              <ToggleGroupItem value="self_reported">
                {m.meds_filter_self_reported()}
              </ToggleGroupItem>
            </ToggleGroup>
          ) : null}
          <div className="flex flex-col gap-3">
            {visible.map((entry) => (
              <EntryRow
                key={`${entry.source}-${entry.id}`}
                entry={entry}
                showSourceBadge={showSourceBadge}
                onEdit={
                  canInteract
                    ? () => {
                        if (entry.source === "recommended") {
                          setEditingRecommendation(entry.item);
                        } else {
                          setEditingMedication(entry.item);
                        }
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </TagsCardShell>

      {canInteract && (
        <>
          <PrescriptionDetailDialog
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
