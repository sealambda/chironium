import type { introspection_types } from "@/graphql-env";

export type AdministrativeGender = introspection_types["AdministrativeGender"]["enumValues"];
export type DurationUnit = introspection_types["DurationUnit"]["enumValues"];

export const durationUnits = [
  "A",
  "D",
  "H",
  "MIN",
  "MO",
  "MS",
  "S",
  "WK",
] as const satisfies readonly DurationUnit[];
