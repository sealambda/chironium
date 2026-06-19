import * as m from "@/paraglide/messages";
import { EMPTY_VALUE_PLACEHOLDER } from "@/shared/utils/display-value";

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

/** Localized FHIR MedicationRequest status. */
export function formatFhirMedicationRequestStatusLabel(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  const v = value.toUpperCase();
  switch (v) {
    case "ACTIVE":
      return m.fhir_medication_request_status_active();
    case "ON_HOLD":
      return m.fhir_medication_request_status_on_hold();
    case "ENDED":
      return m.fhir_medication_request_status_ended();
    case "STOPPED":
      return m.fhir_medication_request_status_stopped();
    case "COMPLETED":
      return m.fhir_medication_request_status_completed();
    case "CANCELLED":
      return m.fhir_medication_request_status_cancelled();
    case "ENTERED_IN_ERROR":
      return m.fhir_medication_request_status_entered_in_error();
    case "DRAFT":
      return m.fhir_medication_request_status_draft();
    case "UNKNOWN":
      return m.fhir_medication_request_status_unknown();
    default:
      return humanizeUnknownEnumToken(v);
  }
}

/** Localized FHIR MedicationRequest course of therapy. */
export function formatFhirCourseOfTherapyLabel(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  const v = value.toUpperCase();
  switch (v) {
    case "CONTINUOUS":
      return m.fhir_course_of_therapy_continuous();
    case "ACUTE":
      return m.fhir_course_of_therapy_acute();
    case "SEASONAL":
      return m.fhir_course_of_therapy_seasonal();
    default:
      return humanizeUnknownEnumToken(v);
  }
}

/** Localized HL7 v3 ActSubstanceAdminSubstitution code (prescription substitution). */
export function formatFhirSubstitutionLabel(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  switch (value.toUpperCase()) {
    case "E":
      return m.fhir_substitution_e();
    case "EC":
      return m.fhir_substitution_ec();
    case "BC":
      return m.fhir_substitution_bc();
    case "G":
      return m.fhir_substitution_g();
    case "TE":
      return m.fhir_substitution_te();
    case "TB":
      return m.fhir_substitution_tb();
    case "TG":
      return m.fhir_substitution_tg();
    case "F":
      return m.fhir_substitution_f();
    case "N":
      return m.fhir_substitution_n();
    default:
      return value;
  }
}
