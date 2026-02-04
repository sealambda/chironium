import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "../priv/schema.graphql",
  documents: [
    "src/**/*.tsx",
    "src/**/*.ts",
    "!src/gql/**/*",
    "!src/mocks/**/*", // Mock queries not in real schema
  ],
  generates: {
    "./src/gql/": {
      preset: "client",
      plugins: [],
      config: {
        enumsAsTypes: true,
        skipTypename: true,
        useTypeImports: true,
      },
    },
  },
};

export default config;
