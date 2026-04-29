import { format } from "date-fns";

import * as m from "@/paraglide/messages";
import { getDateLocale } from "@/shared/utils/date-locale";
import { EMPTY_VALUE_PLACEHOLDER } from "@/shared/utils/display-value";

/** Renders an ISO datetime in a short locale-aware date form for history tables. */
export function formatClinicalHistoryDate(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  try {
    return format(new Date(value), "PP", { locale: getDateLocale() });
  } catch {
    return EMPTY_VALUE_PLACEHOLDER;
  }
}

interface OnsetSource {
  onsetDateTime?: string | null;
  onsetAge?: { value?: string | number | null; code?: string | null } | null;
  onsetPeriod?: { start?: string | null; end?: string | null } | null;
}

function formatAge(age: OnsetSource["onsetAge"]): string | null {
  if (age?.value == null) {
    return null;
  }
  const amount = typeof age.value === "string" ? age.value : String(age.value);
  return age.code ? `${amount} ${age.code}` : amount;
}

export function formatPeriod(period: OnsetSource["onsetPeriod"]): string | null {
  if (!period?.start && !period?.end) {
    return null;
  }
  const start = period.start ? formatClinicalHistoryDate(period.start) : "";
  const end = period.end ? formatClinicalHistoryDate(period.end) : "";
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end || null;
}

/** Formats onset using FHIR precedence: dateTime > age > period. */
export function formatOnset(source: OnsetSource): string | null {
  if (source.onsetDateTime) {
    return formatClinicalHistoryDate(source.onsetDateTime);
  }
  return formatAge(source.onsetAge) ?? formatPeriod(source.onsetPeriod);
}

function humanizeUnknownEnumToken(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}

/** Localized FHIR clinical status (conditions, medications, allergies). */
export function formatFhirClinicalStatusLabel(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  const v = value.toUpperCase();
  switch (v) {
    case "ACTIVE":
      return m.fhir_clinical_active();
    case "INACTIVE":
      return m.fhir_clinical_inactive();
    case "RECURRENCE":
      return m.fhir_clinical_recurrence();
    case "RELAPSE":
      return m.fhir_clinical_relapse();
    case "REMISSION":
      return m.fhir_clinical_remission();
    case "RESOLVED":
      return m.fhir_clinical_resolved();
    case "UNKNOWN":
      return m.fhir_clinical_unknown();
    default:
      return humanizeUnknownEnumToken(v);
  }
}

/** Localized FHIR verification status (conditions, medications, allergies). */
export function formatFhirVerificationStatusLabel(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  const v = value.toUpperCase();
  switch (v) {
    case "CONFIRMED":
      return m.fhir_verification_confirmed();
    case "DIFFERENTIAL":
      return m.fhir_verification_differential();
    case "ENTERED_IN_ERROR":
      return m.fhir_verification_entered_in_error();
    case "PRESUMED":
      return m.fhir_verification_presumed();
    case "PROVISIONAL":
      return m.fhir_verification_provisional();
    case "REFUTED":
      return m.fhir_verification_refuted();
    case "UNCONFIRMED":
      return m.fhir_verification_unconfirmed();
    default:
      return humanizeUnknownEnumToken(v);
  }
}

/** Localized FHIR MedicationStatement status. */
export function formatFhirMedicationStatusLabel(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  const v = value.toUpperCase();
  switch (v) {
    case "RECORDED":
      return m.fhir_medication_status_recorded();
    case "ENTERED_IN_ERROR":
      return m.fhir_medication_status_entered_in_error();
    case "DRAFT":
      return m.fhir_medication_status_draft();
    default:
      return humanizeUnknownEnumToken(v);
  }
}
