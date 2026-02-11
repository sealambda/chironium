import type {
  BodyMetricsRecord,
  CycleRecord,
  NutritionPlanRecord,
  PathologyRecord,
} from "@/mocks/types";

/** Shared across entry sheets and history drawers. */
export type EntryType = "subscription" | "bodyMetrics" | "nutrition" | "cycle" | "pathologies";

/** Discriminated union for the record currently being edited. */
export type EditingRecord =
  | { type: "bodyMetrics"; record: BodyMetricsRecord }
  | { type: "nutrition"; record: NutritionPlanRecord }
  | { type: "pathologies"; record: PathologyRecord }
  | { type: "cycle"; record: CycleRecord };
