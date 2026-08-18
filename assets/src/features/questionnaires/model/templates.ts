import { findMeasurement, measurementPatch } from "@/features/questionnaires/model/measurements";
import type { QuestionnaireItem } from "@/features/questionnaires/model/questionnaire-schemas";
import * as m from "@/paraglide/messages";

/**
 * Starting points for the questionnaires practitioners ask for most. Templates use only
 * what the builder itself can author — free text, options, and measurements — so an
 * opened template is nothing a practitioner could not have built by hand. Measurement
 * questions carry the codes the observation-extraction map understands, so answers land
 * in the matching patient cards automatically. Texts resolve through paraglide at build
 * time, so a template is created in the practitioner's current language and stays fully
 * editable afterwards.
 */

export type TemplateId = "measurements" | "nutrition" | "cycle";

export interface QuestionnaireTemplate {
  id: TemplateId;
  name: () => string;
  description: () => string;
  build: () => { title: string; description: string; items: QuestionnaireItem[] };
}

function text(linkId: string, label: string): QuestionnaireItem {
  return { linkId, type: "text", text: label };
}

function yesNo(linkId: string, label: string): QuestionnaireItem {
  return {
    linkId,
    type: "coding",
    text: label,
    answerOption: [{ valueString: m.common_yes() }, { valueString: m.common_no() }],
  };
}

/** A question whose answer is recorded as `measurementId` (see `measurements.ts`). */
function measurement(linkId: string, label: string, measurementId: string): QuestionnaireItem {
  const concept = findMeasurement(measurementId);
  if (!concept) {
    return text(linkId, label);
  }
  return { linkId, text: label, ...measurementPatch(concept) } as QuestionnaireItem;
}

function buildMeasurements() {
  return {
    title: m.questionnaire_template_measurements(),
    description: m.questionnaire_template_measurements_desc(),
    items: [
      measurement("weight", m.questionnaire_tpl_weight(), "weight"),
      measurement("height", m.questionnaire_tpl_height(), "height"),
      measurement("waist", m.questionnaire_tpl_waist(), "waist"),
      measurement("hip", m.questionnaire_tpl_hip(), "hip"),
      measurement("arm", m.questionnaire_tpl_arm(), "arm"),
      measurement("chest", m.questionnaire_tpl_chest(), "chest"),
      measurement("thigh", m.questionnaire_tpl_thigh(), "thigh"),
    ],
  };
}

function buildNutrition() {
  return {
    title: m.questionnaire_template_nutrition(),
    description: m.questionnaire_template_nutrition_desc(),
    items: [
      text("feeling", m.questionnaire_tpl_nut_feeling()),
      text("sensations", m.questionnaire_tpl_nut_sensations()),
      text("energy", m.questionnaire_tpl_nut_energy()),
      text("changes", m.questionnaire_tpl_nut_changes()),
      text("doubts", m.questionnaire_tpl_nut_doubts()),
    ],
  };
}

function buildCycle() {
  return {
    title: m.questionnaire_template_cycle(),
    description: m.questionnaire_template_cycle_desc(),
    items: [
      measurement("period_start", m.questionnaire_tpl_cycle_period_date(), "period_start"),
      yesNo("delay", m.questionnaire_tpl_cycle_delay()),
      text("delay_days", m.questionnaire_tpl_cycle_delay_days()),
      measurement("duration", m.questionnaire_tpl_cycle_duration(), "period_duration"),
      text("usual_duration", m.questionnaire_tpl_cycle_usual_duration()),
      text("pain", m.questionnaire_tpl_cycle_pain()),
      text("bleeding", m.questionnaire_tpl_cycle_bleeding()),
      yesNo("pain_meds", m.questionnaire_tpl_cycle_pain_meds()),
      yesNo("exercise", m.questionnaire_tpl_cycle_exercise()),
      text("digestive", m.questionnaire_tpl_cycle_digestive()),
      text("other_symptoms", m.questionnaire_tpl_cycle_other_symptoms()),
      text("stool", m.questionnaire_tpl_cycle_stool()),
      text("stress", m.questionnaire_tpl_cycle_stress()),
      text("energy_level", m.questionnaire_tpl_cycle_energy()),
      text("irritability", m.questionnaire_tpl_cycle_irritability()),
      text("anxiety", m.questionnaire_tpl_cycle_anxiety()),
      text("rest", m.questionnaire_tpl_cycle_rest()),
      text("observations", m.questionnaire_tpl_cycle_observations()),
    ],
  };
}

export const QUESTIONNAIRE_TEMPLATES: QuestionnaireTemplate[] = [
  {
    id: "measurements",
    name: () => m.questionnaire_template_measurements(),
    description: () => m.questionnaire_template_measurements_desc(),
    build: buildMeasurements,
  },
  {
    id: "nutrition",
    name: () => m.questionnaire_template_nutrition(),
    description: () => m.questionnaire_template_nutrition_desc(),
    build: buildNutrition,
  },
  {
    id: "cycle",
    name: () => m.questionnaire_template_cycle(),
    description: () => m.questionnaire_template_cycle_desc(),
    build: buildCycle,
  },
];

export function findTemplate(id: string | undefined): QuestionnaireTemplate | undefined {
  return QUESTIONNAIRE_TEMPLATES.find((template) => template.id === id);
}
