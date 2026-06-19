# Agent Instructions

## Package Manager

Always use **pnpm** for package management and script execution. Never use npm, yarn, bun, npx, or any other package manager or runner.

```bash
# Install dependencies.
pnpm install

# Add a package.
pnpm add <package-name>

# Add a dev dependency.
pnpm add -D <package-name>

# Run scripts defined in package.json.
pnpm <script-name>

# Execute a package binary (instead of npx).
pnpm exec <binary>
# Or use the shorthand — pnpm resolves binaries automatically.
pnpm <binary> <args>
```

## Writing and Formatting Standards

All displayable text (comments, documentation, logs, errors, UI messages) must be high quality, concise, non-redundant, minimal yet readable, comprehensive, understandable, meaningful, clean, and well-formatted.

### General Rules

- Full sentences (containing a verb) must end with a period and be grammatically correct.
- Fragments without verbs (labels, titles, section headers) do not need periods.
- Avoid redundancy. Say it once, say it well.
- Prefer active voice over passive voice.
- Use consistent terminology throughout the codebase.

### Inline Comments

- Explain **why**, not **what**. The code shows what; comments explain intent.
- Keep comments on the same line when short, above the code when longer.
- Parenthetical remarks are part of the sentence; end with a period after the closing parenthesis.

**Remove comments that are:**

- Obvious from the code itself (e.g., `// Loop through items` before a `for` loop).
- Restating what a well-named function or variable already conveys.
- Outdated or no longer accurate.
- Placeholder or debug comments (e.g., `// TODO: fix this`, `// temp`).

**Add comments when:**

- The code implements a non-obvious algorithm, workaround, or edge case.
- Business logic or domain rules aren't self-evident from the code.
- External constraints drive the implementation (e.g., API quirks, browser bugs).
- Magic numbers or regex patterns need clarification.

```typescript
// Bad: Restates the obvious.
// Filter active users.
const active = users.filter((u) => u.isActive);

// Good: Explains the why.
// Exclude soft-deleted users from billing calculations.
const billable = users.filter((u) => !u.deletedAt);

// Good: Clarifies non-obvious logic.
// Offset by 1 because the API uses 1-based pagination.
const page = index + 1;
```

### Documentation

- Lead with the most important information.
- Use complete sentences for descriptions.
- Keep examples minimal but illustrative.

### Logs

- Use appropriate log levels: `debug`, `info`, `warn`, `error`.
- Include relevant context without verbosity.
- Format: `[context] action: detail` when applicable.

```typescript
// Bad
console.log("here");

// Good
console.info("[Auth] User authenticated:", userId);
```

### Error Messages

- State what went wrong and, when possible, how to fix it.
- Be specific. Avoid vague messages like "Something went wrong."
- Include relevant identifiers or values for debugging.

```typescript
// Bad
throw new Error("Invalid input");

// Good
throw new Error(`Customer email "${email}" is not a valid email address.`);
```

### UI Text

- Be direct and user-friendly.
- Use sentence case for messages, title case for headings.
- Avoid technical jargon in user-facing text.

## Domain Terminology

### Anthropometry

Following the FHIR standard, all body-related observations (weight, height, BMI, circumferences) are grouped under a single domain concept: **anthropometry** (or **anthropometric data**). Do not split these into separate "body metrics" and "body measurements" categories. Use a flat `AnthropometricSnapshot` interface with all fields optional — no nested `measurements` object.

- API file: `features/customers/api/anthropometry-api.ts`
- Card component: `features/customers/ui/detail/anthropometry-card.tsx`
- i18n prefix: `anthropometry_*`

## Design Patterns

Patterns established during the customers feature refactor. Follow these for consistency.

### Single Responsive Component

Prefer one component with Tailwind `lg:` breakpoints over separate mobile/desktop files. Layout and variation must always be pure Tailwind — no JS-based behavioral branching for layout differences.

### Inline over Overlay

Display data inline in cards rather than behind sheets or drawers. Avoid overlay interactions (bottom sheets, side panels, modals) for browsing or viewing data. Keep the UI single-view and scrollable.

### date-fns for Relative Time

Use `formatDistanceToNowStrict` with `getDateLocale()` from `shared/utils/date-locale.ts` for locale-aware relative dates. Never maintain parallel i18n bucket keys for time units — let date-fns handle pluralization and localization.

### No Arbitrary Tailwind Values

Zero `text-[Xpx]` or custom CSS. Use only standard Tailwind typography tokens (`text-xs`, `text-sm`, `text-base`, etc.).

### Dead Code Policy

If a file has zero importers, delete it. Verify with `grep` before deletion to confirm no references exist.

### Customer Feature

The customers feature supports viewing person profiles, managing subscriptions, and onboarding new customers via a multi-step wizard.

## TypeScript Import Conventions

### Three-Tier Rule

All TypeScript/TSX imports must follow this order, separated by blank lines:

1. **External packages** — npm dependencies (e.g., `react`, `@tanstack/react-query`).
2. **`@/` absolute alias** — any import that crosses a directory boundary, resolved from `src/`.
3. **`./` relative** — same-directory files only.

`../` parent-relative imports are **never** allowed. Convert all `../` imports to `@/`.

**`./` is only valid when the target file is in the same directory as the importing file.**
Imports that descend into subdirectories (e.g., `"./handlers/customer-detail"`) must use `@/`.

```typescript
// Correct.
import { useQuery } from "@tanstack/react-query";

import { useOrg } from "@/features/org/hooks/use-org";
import { fetchCustomerList } from "@/features/customers/api/customers-api";

import { CustomerCard } from "./customer-card";
```

```typescript
// Wrong — never use ../ paths.
import { CustomerCard } from "../ui/customer-card";

// Wrong — ./handlers/ is a subdirectory, not a sibling file.
import { customerDetailHandlers } from "./handlers/customer-detail";
```

### Tooling

Biome's `organizeImports` (configured in `biome.jsonc`) enforces import group ordering
automatically. Run `pnpm check:fix` after edits to auto-sort imports.

### Auto-Generated Files (Do Not Touch)

Never manually edit imports in these generated files:

- `src/routeTree.gen.ts` — TanStack Router
- `src/graphql-env.d.ts` — gql.tada introspection output
- `src/paraglide/` — Paraglide i18n

<!-- usage-rules-start -->
<!-- usage-rules-header -->
# Usage Rules

**IMPORTANT**: Consult these usage rules early and often when working with the packages listed below.
Before attempting to use any of these packages or to discover if you should use them, review their
usage rules to understand the correct patterns, conventions, and best practices.
<!-- usage-rules-header-end -->

<!-- ash_oban-start -->
## ash_oban usage
_The extension for integrating Ash resources with Oban._

[ash_oban usage rules](deps/ash_oban/usage-rules.md)
<!-- ash_oban-end -->
<!-- ash-start -->
## ash usage
_A declarative, extensible framework for building Elixir applications._

[ash usage rules](deps/ash/usage-rules.md)
<!-- ash-end -->
<!-- ash:actions-start -->
## ash:actions usage
[ash:actions usage rules](deps/ash/usage-rules/actions.md)
<!-- ash:actions-end -->
<!-- ash:aggregates-start -->
## ash:aggregates usage
[ash:aggregates usage rules](deps/ash/usage-rules/aggregates.md)
<!-- ash:aggregates-end -->
<!-- ash:authorization-start -->
## ash:authorization usage
[ash:authorization usage rules](deps/ash/usage-rules/authorization.md)
<!-- ash:authorization-end -->
<!-- ash:calculations-start -->
## ash:calculations usage
[ash:calculations usage rules](deps/ash/usage-rules/calculations.md)
<!-- ash:calculations-end -->
<!-- ash:code_interfaces-start -->
## ash:code_interfaces usage
[ash:code_interfaces usage rules](deps/ash/usage-rules/code_interfaces.md)
<!-- ash:code_interfaces-end -->
<!-- ash:code_structure-start -->
## ash:code_structure usage
[ash:code_structure usage rules](deps/ash/usage-rules/code_structure.md)
<!-- ash:code_structure-end -->
<!-- ash:data_layers-start -->
## ash:data_layers usage
[ash:data_layers usage rules](deps/ash/usage-rules/data_layers.md)
<!-- ash:data_layers-end -->
<!-- ash:exist_expressions-start -->
## ash:exist_expressions usage
[ash:exist_expressions usage rules](deps/ash/usage-rules/exist_expressions.md)
<!-- ash:exist_expressions-end -->
<!-- ash:generating_code-start -->
## ash:generating_code usage
[ash:generating_code usage rules](deps/ash/usage-rules/generating_code.md)
<!-- ash:generating_code-end -->
<!-- ash:migrations-start -->
## ash:migrations usage
[ash:migrations usage rules](deps/ash/usage-rules/migrations.md)
<!-- ash:migrations-end -->
<!-- ash:query_filter-start -->
## ash:query_filter usage
[ash:query_filter usage rules](deps/ash/usage-rules/query_filter.md)
<!-- ash:query_filter-end -->
<!-- ash:querying_data-start -->
## ash:querying_data usage
[ash:querying_data usage rules](deps/ash/usage-rules/querying_data.md)
<!-- ash:querying_data-end -->
<!-- ash:relationships-start -->
## ash:relationships usage
[ash:relationships usage rules](deps/ash/usage-rules/relationships.md)
<!-- ash:relationships-end -->
<!-- ash:testing-start -->
## ash:testing usage
[ash:testing usage rules](deps/ash/usage-rules/testing.md)
<!-- ash:testing-end -->
<!-- ash_graphql-start -->
## ash_graphql usage
_The extension for building GraphQL APIs with Ash_

[ash_graphql usage rules](deps/ash_graphql/usage-rules.md)
<!-- ash_graphql-end -->
<!-- ash_authentication-start -->
## ash_authentication usage
_Authentication extension for the Ash Framework._

[ash_authentication usage rules](deps/ash_authentication/usage-rules.md)
<!-- ash_authentication-end -->
<!-- phoenix:ecto-start -->
## phoenix:ecto usage
[phoenix:ecto usage rules](deps/phoenix/usage-rules/ecto.md)
<!-- phoenix:ecto-end -->
<!-- phoenix:elixir-start -->
## phoenix:elixir usage
[phoenix:elixir usage rules](deps/phoenix/usage-rules/elixir.md)
<!-- phoenix:elixir-end -->
<!-- phoenix:html-start -->
## phoenix:html usage
[phoenix:html usage rules](deps/phoenix/usage-rules/html.md)
<!-- phoenix:html-end -->
<!-- phoenix:liveview-start -->
## phoenix:liveview usage
[phoenix:liveview usage rules](deps/phoenix/usage-rules/liveview.md)
<!-- phoenix:liveview-end -->
<!-- phoenix:phoenix-start -->
## phoenix:phoenix usage
[phoenix:phoenix usage rules](deps/phoenix/usage-rules/phoenix.md)
<!-- phoenix:phoenix-end -->
<!-- usage_rules-start -->
## usage_rules usage
_A dev tool for Elixir projects to gather LLM usage rules from dependencies_

[usage_rules usage rules](deps/usage_rules/usage-rules.md)
<!-- usage_rules-end -->
<!-- usage_rules:elixir-start -->
## usage_rules:elixir usage
[usage_rules:elixir usage rules](deps/usage_rules/usage-rules/elixir.md)
<!-- usage_rules:elixir-end -->
<!-- usage_rules:otp-start -->
## usage_rules:otp usage
[usage_rules:otp usage rules](deps/usage_rules/usage-rules/otp.md)
<!-- usage_rules:otp-end -->
<!-- ash_phoenix-start -->
## ash_phoenix usage
_Utilities for integrating Ash and Phoenix_

[ash_phoenix usage rules](deps/ash_phoenix/usage-rules.md)
<!-- ash_phoenix-end -->
<!-- ash_postgres-start -->
## ash_postgres usage
_The PostgreSQL data layer for Ash Framework_

[ash_postgres usage rules](deps/ash_postgres/usage-rules.md)
<!-- ash_postgres-end -->
<!-- igniter-start -->
## igniter usage
_A code generation and project patching framework_

[igniter usage rules](deps/igniter/usage-rules.md)
<!-- igniter-end -->
<!-- usage-rules-end -->
