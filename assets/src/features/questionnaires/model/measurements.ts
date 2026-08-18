import type {
  ItemType,
  QuestionnaireItem,
} from "@/features/questionnaires/model/questionnaire-schemas";
import * as m from "@/paraglide/messages";

/**
 * The measurements a questionnaire answer can be recorded as.
 *
 * Only these codes reach a typed `log_*` observation action, so they are the only ones
 * worth offering: anything else would be stored as an anonymous observation nobody's
 * cards read. Picking one sets the question's FHIR `type`, `code` and `unit` together —
 * the practitioner never sees a code.
 *
 * ponytail: hardcoded mirror of `Chironium.Health.QuestionnaireResponse.
 * ObservationExtractionMap`. Expose it over GraphQL if the list starts changing often.
 */

const LOINC = "http://loinc.org";
const SNOMED = "http://snomed.info/sct";
const UCUM = "http://unitsofmeasure.org";

export interface MeasurementConcept {
  /** Stable value for the picker; not persisted. */
  id: string;
  system: string;
  code: string;
  /** FHIR display, stored on the coding for other FHIR consumers. */
  display: string;
  itemType: ItemType;
  /** UCUM code, for `quantity` measurements only. */
  unit?: string;
  label: () => string;
}

export const MEASUREMENT_CONCEPTS: MeasurementConcept[] = [
  {
    id: "weight",
    system: LOINC,
    code: "29463-7",
    display: "Body weight",
    itemType: "quantity",
    unit: "kg",
    label: () => m.questionnaire_tpl_weight(),
  },
  {
    id: "height",
    system: LOINC,
    code: "8302-2",
    display: "Body height",
    itemType: "quantity",
    unit: "cm",
    label: () => m.questionnaire_tpl_height(),
  },
  {
    id: "waist",
    system: LOINC,
    code: "8280-0",
    display: "Waist circumference",
    itemType: "quantity",
    unit: "cm",
    label: () => m.questionnaire_tpl_waist(),
  },
  {
    id: "hip",
    system: LOINC,
    code: "56063-1",
    display: "Hip circumference",
    itemType: "quantity",
    unit: "cm",
    label: () => m.questionnaire_tpl_hip(),
  },
  {
    id: "arm",
    system: LOINC,
    code: "56072-2",
    display: "Arm circumference",
    itemType: "quantity",
    unit: "cm",
    label: () => m.questionnaire_tpl_arm(),
  },
  {
    id: "chest",
    system: LOINC,
    code: "8279-2",
    display: "Chest circumference",
    itemType: "quantity",
    unit: "cm",
    label: () => m.questionnaire_tpl_chest(),
  },
  {
    id: "thigh",
    system: LOINC,
    code: "8286-7",
    display: "Thigh circumference",
    itemType: "quantity",
    unit: "cm",
    label: () => m.questionnaire_tpl_thigh(),
  },
  {
    id: "period_start",
    system: LOINC,
    code: "8665-2",
    display: "Last menstrual period start date",
    itemType: "date",
    label: () => m.questionnaire_tpl_cycle_period_date(),
  },
  {
    id: "period_duration",
    system: LOINC,
    code: "3144-3",
    display: "Menstrual period duration",
    itemType: "integer",
    label: () => m.questionnaire_meas_period_duration(),
  },
  {
    id: "menarche_age",
    system: LOINC,
    code: "63888-2",
    display: "Age at menarche",
    itemType: "integer",
    label: () => m.questionnaire_meas_menarche_age(),
  },
  {
    id: "food_preference",
    system: SNOMED,
    code: "1163282001",
    display: "Food preference",
    itemType: "text",
    label: () => m.questionnaire_meas_food_preference(),
  },
  {
    id: "food_aversion",
    system: SNOMED,
    code: "248135001",
    display: "Food aversion",
    itemType: "text",
    label: () => m.questionnaire_meas_food_aversion(),
  },
];

export function findMeasurement(id: string): MeasurementConcept | undefined {
  return MEASUREMENT_CONCEPTS.find((concept) => concept.id === id);
}

/** The measurement a question already records, if any (matched on its first code). */
export function measurementOf(item: QuestionnaireItem): MeasurementConcept | undefined {
  const coding = item.code?.[0];
  if (!coding) {
    return undefined;
  }
  return MEASUREMENT_CONCEPTS.find(
    (concept) => concept.system === coding.system && concept.code === coding.code,
  );
}

/** The item fields that make a question record `concept` (fed straight to `updateItem`). */
export function measurementPatch(concept: MeasurementConcept): Partial<QuestionnaireItem> {
  return {
    type: concept.itemType,
    code: [{ system: concept.system, code: concept.code, display: concept.display }],
    unit: concept.unit ? { system: UCUM, code: concept.unit, display: concept.unit } : undefined,
  };
}

/** Reverts a measurement question back to plain free text. */
export function clearMeasurementPatch(): Partial<QuestionnaireItem> {
  return { type: "text", code: undefined, unit: undefined };
}

/**
 * What a question is, as the builder offers it. Free text, a set of options, or a
 * measurement recorded in the patient's records.
 */
export type QuestionKind = "text" | "coding" | "measurement";

/**
 * The kind a stored question reads back as. A mapped measurement code decides this before
 * the FHIR type does: the food concepts are `type: "text"`, so going by type alone would
 * show them as free text and hide their measurement picker.
 */
export function questionKindOf(item: QuestionnaireItem): QuestionKind {
  if (measurementOf(item)) {
    return "measurement";
  }
  if (item.type === "coding") {
    return "coding";
  }
  if (item.type === "text" || item.type === "string") {
    return "text";
  }
  return "measurement";
}

/** The patch that turns a question into `kind`. Measurements default to the first concept. */
export function patchForKind(kind: QuestionKind): Partial<QuestionnaireItem> {
  if (kind === "coding") {
    // sanitizeForType seeds the first blank option.
    return { type: "coding", code: undefined, unit: undefined };
  }
  if (kind === "measurement") {
    const first = MEASUREMENT_CONCEPTS[0];
    return first ? measurementPatch(first) : clearMeasurementPatch();
  }
  return clearMeasurementPatch();
}
