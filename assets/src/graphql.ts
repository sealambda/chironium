import { initGraphQLTada } from "gql.tada";

import type { introspection } from "./graphql-env";

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    Date: string;
    DateTime: string;
    Decimal: string;
    Json: Record<string, unknown>;
    JsonString: string;
  };
}>();

export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
