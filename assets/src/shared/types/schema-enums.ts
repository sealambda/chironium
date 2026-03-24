import type { introspection_types } from "@/graphql-env";

export type AdministrativeGender = introspection_types["AdministrativeGender"]["enumValues"];
export type DurationUnit = introspection_types["DurationUnit"]["enumValues"];

export const supportedDurationUnits = [
  "A",
  "D",
  "MO",
  "WK",
] as const satisfies readonly DurationUnit[];
