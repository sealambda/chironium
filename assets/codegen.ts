import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "../priv/schema.graphql",
  generates: {
    "./src/gql/graphql.ts": {
      plugins: ["typescript"],
      config: {
        enumsAsTypes: true,
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
