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
