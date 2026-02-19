# GraphQL Type System

This project uses [**gql.tada**](https://gql-tada.0no.co) for type-safe GraphQL operations. All query and mutation types are inferred at compile time from the schema — no code generation step required.

## Table of Contents

- [What is gql.tada?](#what-is-gqltada)
- [Why gql.tada over GraphQL Code Generator?](#why-gqltada-over-graphql-code-generator)
- [How It Works](#how-it-works)
- [Project Setup](#project-setup)
- [IDE and Editor Setup](#ide-and-editor-setup)
- [CI/CD and CLI](#cicd-and-cli)
- [Usage Guide](#usage-guide)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)

---

## What is gql.tada?

gql.tada is a GraphQL type inference library for TypeScript. Instead of generating code from your schema at build time, it uses TypeScript's type system to infer result and variable types directly from your `graphql()` tagged template literals — at compile time.

You write GraphQL operations the same way you always have:

```ts
const MyQuery = graphql(`
  query GetUser {
    user {
      id
      name
      email
    }
  }
`);
```

TypeScript automatically knows the result type is `{ user: { id: string; name: string | null; email: string | null } | null }` — no generation step, no generated files, no stale types.

---

## Why gql.tada over GraphQL Code Generator?

Both tools solve the same problem: type-safe GraphQL in TypeScript. They differ fundamentally in _when_ and _how_ types are produced.

### Comparison

| Aspect                     | GraphQL Code Generator                                                                        | gql.tada                                              |
| -------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Type generation**        | Build-time (runs `codegen` CLI)                                                               | Compile-time (TypeScript inference)                   |
| **Generated files**        | `graphql.ts` (all types), `gql.ts` (document map), `fragment-masking.ts`                      | Single `graphql-env.d.ts` (ambient declarations only) |
| **Bundle impact**          | Generated types ship as runtime JS                                                            | Zero runtime JS — `.d.ts` is type-only                |
| **Schema change workflow** | Edit schema, run `codegen`, commit output                                                     | Edit schema, LSP auto-updates `.d.ts`                 |
| **Query change workflow**  | Edit query, run `codegen`, commit output                                                      | Edit query, done (types inferred instantly)           |
| **Editor feedback**        | After running codegen                                                                         | Immediate (via TS Language Service Plugin)            |
| **Tree-shaking**           | Document map is not tree-shakeable                                                            | Each `graphql()` call is independent                  |
| **Custom scalars**         | Configurable, but defaults to `any`                                                           | Configurable via `initGraphQLTada` scalars map        |
| **Type accuracy**          | Generates types for _all_ schema fields                                                       | Infers types for _only the fields you select_         |
| **Fragment masking**       | Generated utilities (often unused)                                                            | Built-in via `readFragment()`                         |
| **Config file**            | `codegen.ts` (plugin-based, can be complex)                                                   | `tsconfig.json` plugin entry                          |
| **Dependencies**           | `@graphql-codegen/cli`, `@graphql-codegen/client-preset`, `@graphql-typed-document-node/core` | `gql.tada` (single package)                           |

### Key Advantages

**No build step for queries.** With codegen, every time you add or modify a GraphQL operation, you must re-run the generator and commit the output. With gql.tada, types are inferred the moment you write the query.

**Exact types, not wide types.** Codegen generates the full `Organization` type with every field in the schema. If your query only selects `id`, `name`, `slug`, the type still includes every other field — it lies about what's actually available at runtime. gql.tada infers types from `ResultOf<typeof Query>`, producing a type matching exactly the fields in your selection set (see [`ResultOf` vs `Omit<>`](#resultof-vs-omit--why-we-dont-use-omit)).

**No runtime cost.** The `graphql-env.d.ts` file is an ambient TypeScript declaration (`.d.ts`). It is never included in the JavaScript bundle. Codegen's output files are `.ts` and ship as runtime code.

---

## How It Works

### Architecture

```txt
schema.graphql
     │
     ▼
┌─────────────────────┐     ┌───────────────────┐
│  gql.tada/ts-plugin │───▶│ graphql-env.d.ts  │  (introspection as TS types)
│  (TS Language       │     │  (ambient .d.ts)  │
│   Service Plugin)   │     └────────┬──────────┘
└─────────────────────┘              │
                                     ▼
                           ┌───────────────────┐
                           │   graphql.ts      │  (initGraphQLTada + scalars)
                           │   exports graphql │
                           └────────┬──────────┘
                                    │
                                    ▼
                           ┌───────────────────┐
                           │  Your API files   │  graphql(`query ...`)
                           │  Result types are │  → TypedDocumentNode
                           │  inferred inline  │  → ResultOf / VariablesOf
                           └───────────────────┘
```

1. **Schema introspection** — The TS plugin reads `schema.graphql` and produces `graphql-env.d.ts`, which encodes the entire schema as a TypeScript type.

2. **Init file** — `src/graphql.ts` calls `initGraphQLTada()` with the introspection type and custom scalar mappings, producing a typed `graphql()` function.

3. **Query authoring** — Each `graphql()` tagged template literal produces a `TadaDocumentNode` (extends `TypedDocumentNode`) with inferred result and variable types.

4. **Type extraction** — `ResultOf<typeof MyQuery>` extracts the result type. `VariablesOf<typeof MyQuery>` extracts the variables type.

### What `graphql-env.d.ts` Contains

This file is the compile-time equivalent of an introspection query result. It declares the schema's types, fields, enums, and input objects as TypeScript types. gql.tada reads it to infer what fields exist, what types they return, and what variables each operation accepts.

It is:

- **Auto-generated** — by the CLI or the TS plugin
- **Committed to git** — so CI and other developers have it without running generation
- **Never hand-edited** — always regenerate from the schema

---

## Project Setup

### File Inventory

| File                               | Role                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `src/graphql.ts`                   | Init file — creates the typed `graphql()` function, maps custom scalars |
| `src/graphql-env.d.ts`             | Auto-generated introspection output (ambient `.d.ts`)                   |
| `src/shared/types/schema-enums.ts` | Standalone enum types used outside query contexts                       |
| `tsconfig.json`                    | Root config — registers the TS plugin                                   |
| `tsconfig.app.json`                | App config — also registers the TS plugin                               |

### `src/graphql.ts`

```ts
import { initGraphQLTada } from "gql.tada";

import type { introspection } from "./graphql-env";

export const graphql = initGraphQLTada<{
  introspection: typeof introspection;
  scalars: {
    Date: string;
    DateTime: string;
    Decimal: string;
    Json: Record<string, unknown>;
    JsonString: string;
  };
}>();

export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
```

The `scalars` map overrides the default `unknown` mapping for custom GraphQL scalars. Every custom scalar in the schema must be listed here with its TypeScript equivalent.

### `tsconfig.json` Plugin

```jsonc
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "gql.tada/ts-plugin",
        "schema": "../priv/schema.graphql",
        "tadaOutputLocation": "src/graphql-env.d.ts",
      },
    ],
  },
}
```

- **`name`** — The TS Language Service Plugin. Requires TypeScript >= 5.5 (we use 5.9).
- **`schema`** — Path to the GraphQL SDL file (relative to the tsconfig).
- **`tadaOutputLocation`** — Where to write the introspection output.

---

## IDE and Editor Setup

### VSCode (recommended)

The TS plugin activates automatically when VSCode uses the workspace TypeScript version. The project's `.vscode/settings.json` includes:

```json
{
  "typescript.tsdk": "assets/node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

**What you get:**

- Autocomplete inside `graphql()` template literals (field names, arguments, types)
- Inline diagnostics for invalid queries (typos, missing fields, wrong variable types)
- Hover-to-inspect result types

**Optional:** Install the [GraphQL: Syntax Highlighting](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql-syntax) extension for syntax coloring inside template literals.

**Verify it works:** Open any API file (e.g., `src/features/user/api/user-api.ts`), place your cursor inside a `graphql()` template, and trigger autocomplete. You should see schema fields.

### Neovim

Neovim's built-in LSP client supports TypeScript Language Service Plugins when using `ts_ls` (formerly `tsserver`):

```lua
-- lspconfig setup
require("lspconfig").ts_ls.setup({
  init_options = {
    plugins = {
      {
        name = "gql.tada/ts-plugin",
        location = require("lspconfig.util").find_node_modules_ancestor(
          vim.fn.getcwd()
        ) .. "/node_modules/gql.tada",
      },
    },
  },
})
```

Autocomplete and diagnostics work the same as in VSCode — the TS plugin runs inside the language server process.

### Other Editors

Any editor that uses the TypeScript Language Service (WebStorm, Sublime Text with LSP, Zed, Helix) will pick up the plugin from `tsconfig.json` automatically. Ensure the editor uses the **workspace TypeScript** (from `node_modules/typescript`), not a global or bundled version.

### Environments Without a TS Plugin (terminal, CI)

The TS plugin only provides editor features (autocomplete, inline diagnostics). Type checking itself (`tsc --noEmit`) works without the plugin — it uses the committed `graphql-env.d.ts` file directly.

For GraphQL-specific validation outside an editor, use the CLI:

```bash
pnpm gql:check
```

This runs all GraphQL diagnostics (invalid queries, missing fields, type mismatches) and outputs results to the terminal. It also supports GitHub Actions annotations for PR feedback.

---

## CI/CD and CLI

### Available Scripts

```bash
pnpm gql:generate   # Regenerate graphql-env.d.ts from the schema
pnpm gql:check      # Run GraphQL diagnostics (like the editor, but in terminal)
```

### When to Run `gql:generate`

Only when the **GraphQL schema** (`priv/schema.graphql`) changes. You do **not** need to run it when adding or modifying queries/mutations — those types are inferred at compile time.

In local development, the TS plugin auto-regenerates the file when it detects schema changes. The CLI command exists for:

- CI pipelines that need to verify the committed file is up to date
- Developers not using an editor with the TS plugin (e.g., terminal-only workflows)

### CI Pipeline Integration

Add these steps after checking out the code:

```yaml
# GitHub Actions example
- name: Verify GraphQL types
  working-directory: assets
  run: |
    pnpm gql:generate
    pnpm gql:check
    git diff --name-status --exit-code .
```

The `git diff --exit-code` step fails the build if `graphql-env.d.ts` is out of date, ensuring the committed file always matches the schema.

### CLI Reference

| Command                    | What it does                                        |
| -------------------------- | --------------------------------------------------- |
| `gql.tada generate output` | Regenerates `graphql-env.d.ts` from the schema      |
| `gql.tada check`           | Runs GraphQL diagnostics across all source files    |
| `gql.tada doctor`          | Validates setup (packages, config, schema)          |
| `gql.tada turbo`           | Generates a type cache for faster type evaluation   |
| `gql.tada generate schema` | Fetches a schema from a URL and writes it to a file |

All commands accept `--tsconfig <path>` to specify a non-default tsconfig.

---

## Usage Guide

### Writing a Query

```ts
import { graphql, type ResultOf } from "@/graphql";
import { requestGraphql } from "@/shared/api/graphql";

const ListPatientsQuery = graphql(`
  query ListPatients($first: Int) {
    listPatients(first: $first) {
      results {
        id
        person {
          name {
            given
            family
          }
        }
      }
    }
  }
`);

// Types are automatically inferred:
// ResultOf<typeof ListPatientsQuery> = {
//   listPatients: {
//     results: Array<{
//       id: string;
//       person: { name: Array<{ given: string[] | null; family: string | null }> | null } | null;
//     }> | null;
//   } | null;
// }

export async function fetchPatients() {
  const data = await requestGraphql({
    document: ListPatientsQuery,
    variables: { first: 50 },
  });
  return data.listPatients?.results ?? [];
}
```

### Writing a Mutation

```ts
const CreatePatientMutation = graphql(`
  mutation CreatePatient($input: CreatePatientInput!) {
    createPatient(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);
```

The `graphql()` function produces a `TadaDocumentNode` that is compatible with `TypedDocumentNode` — it works with `graphql-request`, Apollo Client, urql, and any other client that supports typed documents.

### Deriving Types from Queries

Derive types directly from your queries using `ResultOf`:

```ts
// The type contains exactly the fields in the query — nothing more.
type Patient = NonNullable<
  NonNullable<ResultOf<typeof ListPatientsQuery>["listPatients"]>["results"]
>[number];
```

This pattern ensures the type is always in sync with the query. If you add or remove fields from the query, the type updates automatically.

### `ResultOf` vs `Omit<>` — Why We Don't Use `Omit`

With the old codegen approach, you'd import a full schema type like `Organization` (containing every field defined in the schema), then narrow it:

```ts
// OLD (codegen) — the type is wider than the data
import type { Organization } from "@/gql/graphql";
type OrganizationSummary = Omit<Organization, "paperTrailVersions">;
```

This has two problems:

1. **The type lies.** `Organization` has 15+ fields, but your query only selects `id`, `name`, `slug`. The type says `description`, `address`, etc. exist — they don't at runtime. Accessing them compiles but returns `undefined`.

2. **It drifts.** When someone adds a field to the schema, the `Organization` type grows. Your `Omit<>` may need updating, or worse — the type silently includes fields your query never fetches.

With `ResultOf`, the type matches **exactly** what the query selects:

```ts
// NEW (gql.tada) — the type matches the data
const ListOrganizationsQuery = graphql(`
  query ListOrganizations($first: Int) {
    listOrganizations(first: $first) {
      results {
        id
        name
        slug
      }
    }
  }
`);

// Type is exactly: { id: string; name: string | null; slug: string }
type OrganizationSummary = NonNullable<
  NonNullable<
    ResultOf<typeof ListOrganizationsQuery>["listOrganizations"]
  >["results"]
>[number];
```

**Rule: never use `Omit<>` or `Pick<>` on schema types.** Always derive from `ResultOf` — it's exact, it auto-updates, and it can't lie.

### Custom Scalars

Custom scalars are mapped in `src/graphql.ts`:

| GraphQL Scalar  | TypeScript Type           | Notes                                      |
| --------------- | ------------------------- | ------------------------------------------ |
| `String`        | `string`                  | Built-in (automatic)                       |
| `Int` / `Float` | `number`                  | Built-in (automatic)                       |
| `Boolean`       | `boolean`                 | Built-in (automatic)                       |
| `ID`            | `string`                  | Built-in (automatic)                       |
| `Date`          | `string`                  | ISO 8601 date (`2024-01-15`)               |
| `DateTime`      | `string`                  | ISO 8601 datetime (`2024-01-15T10:30:00Z`) |
| `Decimal`       | `string`                  | Arbitrary-precision decimal                |
| `Json`          | `Record<string, unknown>` | Parsed JSON object                         |
| `JsonString`    | `string`                  | Raw JSON string                            |

If the schema adds new custom scalars, add them to the `scalars` map in `src/graphql.ts`. Without an explicit mapping, custom scalars default to `unknown`.

### Enums

GraphQL enums are inferred as string literal unions. For enums used outside query contexts (e.g., in form components), we define explicit types in `src/shared/types/schema-enums.ts`:

```ts
export type AdministrativeGender = "FEMALE" | "MALE" | "OTHER" | "UNKNOWN";
export type DurationUnit = "A" | "D" | "H" | "MIN" | "MO" | "S" | "WK";
```

For enums only used within query results, no manual definition is needed — the type is inferred from the query.

You can also extract enum types programmatically using `graphql.scalar()`:

```ts
type AdministrativeGender = ReturnType<
  typeof graphql.scalar<"AdministrativeGender">
>;
```

### Standalone Object Types

For schema object types used in utility functions (outside query contexts), define minimal interfaces matching only the fields you need:

```ts
// In shared/utils/person-utils.ts
export interface HumanName {
  given?: string[] | null;
  family?: string | null;
  text?: string | null;
}
```

TypeScript's structural typing ensures query results (which have these fields) are assignable to these interfaces without explicit casting.

### Fragments

gql.tada supports fragment colocation — defining data requirements alongside components:

```ts
const PatientFragment = graphql(`
  fragment PatientInfo on Patient {
    id
    person { name { given family } }
  }
`);

// Use in a parent query — pass fragments as the second argument:
const ListQuery = graphql(`
  query ListPatients {
    listPatients { results { ...PatientInfo } }
  }
`, [PatientFragment]);

// In a component:
import { readFragment, type FragmentOf } from "@/graphql";

function PatientCard({ data }: { data: FragmentOf<typeof PatientFragment> }) {
  const patient = readFragment(PatientFragment, data);
  return <div>{patient.person?.name?.[0]?.given?.[0]}</div>;
}
```

Fragment masking is enforced at the type level: the parent query cannot access fragment fields directly — you must call `readFragment()` to unwrap them. This prevents components from depending on data they didn't declare. There is zero runtime overhead; masking is purely a TypeScript constraint.

### When to Use What: `ResultOf` vs Fragments vs Standalone Interfaces

These three patterns solve different problems. Choosing the wrong one doesn't break anything, but choosing the right one keeps your code honest and maintainable.

| Pattern                    | What it does                                                                 | Use when                                                                         |
| -------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `ResultOf<typeof Query>`   | Extracts the exact result type of a query                                    | One query, one consumer — you need a named type for the return value             |
| Fragments + `readFragment` | Lets each component declare its own data needs, composed into a parent query | Multiple components render **different parts** of the same query result          |
| Standalone interfaces      | Defines a minimal shape for use in pure utility functions                    | A function accepts data from **any** query (e.g., `formatName(name: HumanName)`) |

**`ResultOf` — the default choice.** Use this whenever an API function fetches data and you need a type for its return value. The type contains exactly the fields in the query — no more, no less.

```ts
// user-api.ts — one query, one consumer
const CurrentActorQuery = graphql(`
  query CurrentActor {
    currentActor {
      id
      email
      picture
      name
      familyName
      givenName
    }
  }
`);

// Type is exactly { id: string; email: string | null; picture: string | null; ... }
export type UserProfile = NonNullable<
  ResultOf<typeof CurrentActorQuery>["currentActor"]
>;
```

**Fragments — for component-level data requirements.** Use when multiple components each need a different subset of the same entity, and you want to enforce that each component only accesses its own fields.

```ts
// user-avatar.tsx — only needs picture
const AvatarFragment = graphql(`
  fragment UserAvatar on Actor {
    id
    picture
  }
`);

// user-greeting.tsx — only needs the name
const GreetingFragment = graphql(`
  fragment UserGreeting on Actor {
    givenName
  }
`);

// The query composes both — each component only sees its own fragment
const CurrentActorQuery = graphql(
  `
    query CurrentActor {
      currentActor {
        ...UserAvatar
        ...UserGreeting
      }
    }
  `,
  [AvatarFragment, GreetingFragment],
);
```

Fragments add indirection (`readFragment()` calls, `FragmentOf` props). They pay off when you have component-level data isolation needs. They don't pay off when a single function consumes the entire query result.

**Standalone interfaces — for shared utilities.** Use when a pure function (not tied to any specific query) needs to accept a data shape. TypeScript structural typing handles the rest.

```ts
// shared/utils/person-utils.ts — works with any query that includes these fields
export interface HumanName {
  given?: string[] | null;
  family?: string | null;
}

export function formatName(name: HumanName): string {
  return [name.given?.[0], name.family].filter(Boolean).join(" ");
}
```

**This project currently uses `ResultOf` and standalone interfaces.** Fragments are supported but not yet needed — each query has a single consumer. When the UI grows to have multiple components rendering parts of the same entity, fragments become the right tool.

---

## Common Commands

```bash
# Regenerate introspection types after a schema change
pnpm gql:generate

# Run GraphQL-specific diagnostics
pnpm gql:check

# Full quality check (includes TypeScript + Biome)
pnpm quality

# Type check only
pnpm typecheck
```

---

## Troubleshooting

### Autocomplete not working in VSCode

1. Verify VSCode uses the workspace TypeScript: check the status bar (bottom-right) for the TS version. It should match `node_modules/typescript`.
2. Run `TypeScript: Select TypeScript Version` from the command palette and choose "Use Workspace Version".
3. Restart the TS server: `TypeScript: Restart TS Server` from the command palette.

### Types are stale after a schema change

The TS plugin auto-regenerates `graphql-env.d.ts` when the schema changes. If it doesn't:

```bash
pnpm gql:generate
```

Then restart the TS server in your editor.

### `unknown` type for a custom scalar

Add the scalar to the `scalars` map in `src/graphql.ts`. Every custom scalar in the schema must be explicitly mapped.

### CI fails with "graphql-env.d.ts is out of date"

Run `pnpm gql:generate` locally and commit the updated file.

### Doctor command

When something isn't working and you're not sure why:

```bash
npx gql.tada doctor --tsconfig tsconfig.app.json
```

This validates your configuration, schema, packages, and setup.

---

## References

- [gql.tada documentation](https://gql-tada.0no.co)
- [gql.tada GitHub](https://github.com/0no-co/gql.tada)
- [GraphQL Code Generator documentation](https://the-guild.dev/graphql/codegen) (previous tool)
- [TypedDocumentNode specification](https://github.com/dotansimha/graphql-typed-document-node)
