# Agent Instructions

## Package Manager

Always use **pnpm** for package management. Do not use npm, yarn, bun, or any other package manager.

```bash
# Install dependencies.
pnpm install

# Add a package.
pnpm add <package-name>

# Add a dev dependency.
pnpm add -D <package-name>

# Run scripts.
pnpm <script-name>
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

### Read-Only Customer Feature

The customers feature is strictly for viewing and managing existing data. No creation or onboarding flows exist in the codebase.

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
- `src/gql/fragment-masking.ts`, `src/gql/gql.ts`, `src/gql/graphql.ts`, `src/gql/index.ts` — GraphQL Codegen
- `src/paraglide/` — Paraglide i18n
