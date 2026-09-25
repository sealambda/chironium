import type { introspection_types } from "@/graphql-env";

export type AdministrativeGender = introspection_types["AdministrativeGender"]["enumValues"];
export type DurationUnit = introspection_types["DurationUnit"]["enumValues"];
export type GoalCategory = introspection_types["GoalCategory"]["enumValues"];
export type GoalPriority = introspection_types["GoalPriority"]["enumValues"];
export type OrganizationUserRole = introspection_types["OrganizationUserRole"]["enumValues"];
export type PrincipalType = introspection_types["PrincipalType"]["enumValues"];
export type TaskStatus = introspection_types["TaskStatus"]["enumValues"];

export const supportedDurationUnits = [
  "A",
  "D",
  "MO",
  "WK",
] as const satisfies readonly DurationUnit[];
