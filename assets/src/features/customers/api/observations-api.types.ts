import type { PatientObservation } from "@/features/customers/api/patients-api";

/** Form data for recording a menstrual period from the person detail page. */
export interface MenstrualCycleRecordFormData {
  startDate: string;
  durationDays: number | null;
  notes: string;
}

/** Form data for creating or editing a free-text observation. */
export interface ClinicalNoteFormData {
  body: string;
  effectiveDate?: string | null;
  effectiveTime?: string | null;
}

/** A single observation item returned by the centralized patient query. */
export type ObservationItem = PatientObservation;

/** Paginated observations result. */
export interface ObservationsPage {
  items: ObservationItem[];
  count: number;
  endKeyset: string | null;
}

export interface MenstrualCycleSummary {
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  notes: string | null;
  startObservationId?: string | null;
  durationObservationId?: string | null;
  sourceNotes?: ObservationItem["note"] | null;
  paperTrailVersions?: ObservationItem["paperTrailVersions"] | null;
}

/** A single menstrual cycle event identified by the period-start observation. */
export interface MenstrualCycleEntry extends MenstrualCycleSummary {
  /** ID of the underlying period-start observation. */
  id: string;
  /** Period-start timestamp suitable for ordering feed events. */
  effectiveDateTime: string;
}
