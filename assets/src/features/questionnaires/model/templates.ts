import type { QuestionnaireItem } from "@/features/questionnaires/model/questionnaire-schemas";
import * as m from "@/paraglide/messages";

/**
 * Starting points for the questionnaires practitioners ask for most. Each template
 * carries the LOINC codes the observation-extraction map understands, so answers land
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

const LOINC = "http://loinc.org";
const UCUM = "http://unitsofmeasure.org";

function quantity(
  linkId: string,
  text: string,
  code: string,
  display: string,
  unit: string,
): QuestionnaireItem {
  return {
    linkId,
    type: "quantity",
    text,
    code: [{ system: LOINC, code, display }],
    unit: { system: UCUM, code: unit, display: unit },
  };
}

function scale(linkId: string, text: string): QuestionnaireItem {
  return { linkId, type: "integer", text, minValue: 1, maxValue: 10 };
}

function buildMeasurements() {
  return {
    title: m.questionnaire_template_measurements(),
    description: m.questionnaire_template_measurements_desc(),
    items: [
      {
        linkId: "measurements",
        type: "group" as const,
        text: m.questionnaire_tpl_meas_section(),
        item: [
          quantity("weight", m.questionnaire_tpl_weight(), "29463-7", "Body weight", "kg"),
          quantity("height", m.questionnaire_tpl_height(), "8302-2", "Body height", "cm"),
          quantity("waist", m.questionnaire_tpl_waist(), "8280-0", "Waist circumference", "cm"),
          quantity("hip", m.questionnaire_tpl_hip(), "56063-1", "Hip circumference", "cm"),
          quantity("arm", m.questionnaire_tpl_arm(), "56072-2", "Arm circumference", "cm"),
          quantity("chest", m.questionnaire_tpl_chest(), "8279-2", "Chest circumference", "cm"),
          quantity("thigh", m.questionnaire_tpl_thigh(), "8286-7", "Thigh circumference", "cm"),
        ],
      },
    ],
  };
}

function buildNutrition() {
  const text = (linkId: string, label: string): QuestionnaireItem => ({
    linkId,
    type: "text",
    text: label,
  });
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
  const items: QuestionnaireItem[] = [
    {
      linkId: "basics",
      type: "group",
      text: m.questionnaire_tpl_cycle_section_basics(),
      item: [
        {
          linkId: "period_start",
          type: "date",
          text: m.questionnaire_tpl_cycle_period_date(),
          code: [{ system: LOINC, code: "8665-2", display: "Last menstrual period start date" }],
        },
        { linkId: "delay", type: "boolean", text: m.questionnaire_tpl_cycle_delay() },
        {
          linkId: "delay_days",
          type: "integer",
          text: m.questionnaire_tpl_cycle_delay_days(),
          enableWhen: [{ question: "delay", operator: "=", answerBoolean: true }],
        },
        {
          linkId: "duration",
          type: "integer",
          text: m.questionnaire_tpl_cycle_duration(),
          code: [{ system: LOINC, code: "3144-3", display: "Menstrual period duration" }],
        },
        {
          linkId: "usual_duration",
          type: "integer",
          text: m.questionnaire_tpl_cycle_usual_duration(),
        },
      ],
    },
    {
      linkId: "intensity",
      type: "group",
      text: m.questionnaire_tpl_cycle_section_intensity(),
      item: [
        scale("pain", m.questionnaire_tpl_cycle_pain()),
        scale("bleeding", m.questionnaire_tpl_cycle_bleeding()),
        { linkId: "pain_meds", type: "boolean", text: m.questionnaire_tpl_cycle_pain_meds() },
        { linkId: "exercise", type: "boolean", text: m.questionnaire_tpl_cycle_exercise() },
      ],
    },
    {
      linkId: "symptoms",
      type: "group",
      text: m.questionnaire_tpl_cycle_section_symptoms(),
      item: [
        { linkId: "digestive", type: "text", text: m.questionnaire_tpl_cycle_digestive() },
        {
          linkId: "other_symptoms",
          type: "text",
          text: m.questionnaire_tpl_cycle_other_symptoms(),
        },
        { linkId: "stool", type: "text", text: m.questionnaire_tpl_cycle_stool() },
      ],
    },
    {
      linkId: "mood",
      type: "group",
      text: m.questionnaire_tpl_cycle_section_mood(),
      item: [
        scale("stress", m.questionnaire_tpl_cycle_stress()),
        scale("energy_level", m.questionnaire_tpl_cycle_energy()),
        scale("irritability", m.questionnaire_tpl_cycle_irritability()),
        scale("anxiety", m.questionnaire_tpl_cycle_anxiety()),
        scale("rest", m.questionnaire_tpl_cycle_rest()),
      ],
    },
    { linkId: "observations", type: "text", text: m.questionnaire_tpl_cycle_observations() },
  ];
  return {
    title: m.questionnaire_template_cycle(),
    description: m.questionnaire_template_cycle_desc(),
    items,
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
