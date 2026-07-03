import { z } from "zod";

/**
 * Zod schemas for the FHIR Questionnaire `item` tree and the QuestionnaireResponse
 * `item`/`answer` tree. The backend stores these as JSON (the `Json` GraphQL scalar), so
 * these schemas are the frontend's source of truth for the shape. Keys mirror FHIR's
 * camelCase JSON form.
 */

/** Item types the builder/fill UI supports (a subset of the R5 value set). */
export const ITEM_TYPES = [
  "group",
  "display",
  "boolean",
  "decimal",
  "integer",
  "date",
  "dateTime",
  "string",
  "text",
  "coding",
  "quantity",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

/** Item types that carry an answer (everything except structural group/display). */
export function isAnswerable(type: ItemType): boolean {
  return type !== "group" && type !== "display";
}

export const codingSchema = z.object({
  system: z.string(),
  code: z.string(),
  display: z.string().nullish(),
});

export type Coding = z.infer<typeof codingSchema>;

const quantityValueSchema = z.object({
  value: z.number().nullish(),
  unit: z.string().nullish(),
  system: z.string().nullish(),
  code: z.string().nullish(),
});

/** A single inline answer option for `coding` questions. */
export const answerOptionSchema = z.object({
  valueCoding: codingSchema.nullish(),
  valueString: z.string().nullish(),
  valueInteger: z.number().int().nullish(),
  valueDate: z.string().nullish(),
});

export type AnswerOption = z.infer<typeof answerOptionSchema>;

export const enableOperators = ["exists", "=", "!=", ">", "<", ">=", "<="] as const;
export type EnableOperator = (typeof enableOperators)[number];

/** A condition that shows an item only when a prior answer matches. */
export const enableWhenSchema = z.object({
  question: z.string(),
  operator: z.enum(enableOperators),
  answerBoolean: z.boolean().nullish(),
  answerString: z.string().nullish(),
  answerInteger: z.number().nullish(),
  answerDecimal: z.number().nullish(),
  answerDate: z.string().nullish(),
  answerCoding: codingSchema.nullish(),
});

export type EnableWhen = z.infer<typeof enableWhenSchema>;

export interface QuestionnaireItem {
  linkId: string;
  type: ItemType;
  text?: string | null;
  prefix?: string | null;
  code?: Coding[] | null;
  required?: boolean | null;
  repeats?: boolean | null;
  readOnly?: boolean | null;
  maxLength?: number | null;
  /** Flattened FHIR minValue/maxValue extensions: numeric bounds; on `integer`, a scale. */
  minValue?: number | null;
  maxValue?: number | null;
  answerConstraint?: "optionsOnly" | "optionsOrType" | "optionsOrString" | null;
  answerOption?: AnswerOption[] | null;
  enableWhen?: EnableWhen[] | null;
  enableBehavior?: "all" | "any" | null;
  unit?: Coding | null;
  item?: QuestionnaireItem[] | null;
}

export const questionnaireItemSchema: z.ZodType<QuestionnaireItem> = z.lazy(() =>
  z.object({
    linkId: z.string().min(1),
    type: z.enum(ITEM_TYPES),
    text: z.string().nullish(),
    prefix: z.string().nullish(),
    code: z.array(codingSchema).nullish(),
    required: z.boolean().nullish(),
    repeats: z.boolean().nullish(),
    readOnly: z.boolean().nullish(),
    maxLength: z.number().int().nullish(),
    minValue: z.number().nullish(),
    maxValue: z.number().nullish(),
    answerConstraint: z.enum(["optionsOnly", "optionsOrType", "optionsOrString"]).nullish(),
    answerOption: z.array(answerOptionSchema).nullish(),
    enableWhen: z.array(enableWhenSchema).nullish(),
    enableBehavior: z.enum(["all", "any"]).nullish(),
    unit: codingSchema.nullish(),
    item: z.array(questionnaireItemSchema).nullish(),
  }),
);

export const questionnaireItemsSchema = z.array(questionnaireItemSchema);

/** A single answer value — exactly one `value[x]` is set. */
export const answerSchema = z.object({
  valueBoolean: z.boolean().nullish(),
  valueDecimal: z.number().nullish(),
  valueInteger: z.number().int().nullish(),
  valueDate: z.string().nullish(),
  valueDateTime: z.string().nullish(),
  valueString: z.string().nullish(),
  valueCoding: codingSchema.nullish(),
  valueQuantity: quantityValueSchema.nullish(),
});

export type Answer = z.infer<typeof answerSchema>;

export interface ResponseItem {
  linkId: string;
  text?: string | null;
  answer?: Answer[] | null;
  item?: ResponseItem[] | null;
}

export const responseItemSchema: z.ZodType<ResponseItem> = z.lazy(() =>
  z.object({
    linkId: z.string().min(1),
    text: z.string().nullish(),
    answer: z.array(answerSchema).nullish(),
    item: z.array(responseItemSchema).nullish(),
  }),
);

export const responseItemsSchema = z.array(responseItemSchema);
