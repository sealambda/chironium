# Agent Instructions

## Execution Discipline

Tool calls precede narration. Never write "I'll now do X" or declare a step complete before the tool call that performs it has returned. Plan text and tool calls must be in the same response — narrating completion before execution is a hallucination of work.

When a prompt or instruction lists files to load as a prerequisite phase (e.g. skill files, docs), issue all `read_file` calls as the very first action in the response with no introductory text. Nothing else runs until every required file has been read.

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

## Documentation Lookup

Before implementing with any external library or API, look up its current documentation. Never rely on memorized patterns — APIs evolve and training data goes stale.

1. Call `mcp_io_github_ups_resolve-library-id "<library name>"` to get a Context7 library ID.
2. Call `mcp_io_github_ups_get-library-docs` with the resolved ID and a topic describing what you need.
3. If no Context7 entry exists, fetch the official docs URL with `fetch_webpage`.

Implement against the documentation you retrieved, not against assumptions. This applies to every library — not just UI components.

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
- Use sentence case for messages, title case for headings and buttons.
- Avoid technical jargon in user-facing text.

## Domain Terminology

### Anthropometry

Following the FHIR standard, all body-related observations (weight, height, BMI, circumferences) are grouped under a single domain concept: **anthropometry** (or **anthropometric data**). Do not split these into separate "body metrics" and "body measurements" categories. Use a flat `AnthropometricSnapshot` interface with all fields optional — no nested `measurements` object.

- API file: `features/customers/api/anthropometry-api.ts`
- Card component: `features/customers/ui/detail/anthropometry-card.tsx`
- i18n prefix: `anthropometry_*`

## Design Patterns

Patterns established during the customers feature refactor. Follow these for consistency.

### Mobile-First Responsive Design

Design for mobile first, then scale up through tablet and desktop breakpoints. All views must be designed and implemented across the full responsive range (mobile → tablet → desktop). Base styles target mobile; use `sm:`, `md:`, and `lg:` Tailwind prefixes to layer tablet and desktop adaptations.

### Single Responsive Component

Prefer one component with Tailwind `lg:` breakpoints over separate mobile/desktop files. Layout and variation must always be pure Tailwind — no JS-based behavioral branching for layout differences. This applies to viewport-driven layout differences only — semantic or behavioral variants (e.g., different composer modes) should still use composition patterns with separate components.

### Inline over Overlay

Display data inline in cards rather than behind sheets or drawers. Avoid overlay interactions (bottom sheets, side panels, modals) for browsing or viewing data. Keep the UI single-view and scrollable. The one exception is confirmation dialogs for destructive actions (delete, cancel subscription, etc.).

### date-fns for Relative Time

Use `formatDistanceToNowStrict` with `getDateLocale()` from `shared/utils/date-locale.ts` for locale-aware relative dates. Never maintain parallel i18n bucket keys for time units — let date-fns handle pluralization and localization. Do not use `Intl.RelativeTimeFormat` or other APIs for relative time — this overrides any design skill guidance recommending `Intl.*` for date formatting.

### No Arbitrary Tailwind Values

Zero `text-[Xpx]`, `min-h-[44px]`, `top-[117px]`, or any bracket-syntax arbitrary values. No custom CSS, CSS variables, or inline styles. Use only standard Tailwind tokens — if a value is missing from the default theme, extend `tailwind.config` rather than using bracket notation. This overrides design skill guidance that recommends arbitrary values, custom CSS effects, or raw hex colors — always use the nearest Tailwind token instead.

### Explicit Transition Properties

Never use `transition-all`. List properties explicitly: `transition-colors`, `transition-opacity`, `transition-transform`, etc.

### Dead Code Policy

If a file has zero importers, delete it. Verify with `grep` before deletion to confirm no references exist.

### Canonical UI Patterns

Before writing any UI component, run `pnpm shadcn search <name>`. Use the first option that satisfies the functional requirement:

1. **shadcn/ui** — `pnpm shadcn add <component>`, used exactly as documented.
2. **Base UI** — headless primitives when shadcn has no matching component.
3. **Community registry** — shadcn/ui blocks, origin-ui, or a library with substantial adoption and active maintenance. Skip niche or poorly maintained packages.
4. **Custom** — only when 1–3 cannot satisfy the functional requirement. Style preference is never a justification.

- Use built-in `variant`, `size`, and `className` props before touching component source.
- Do not wrap shadcn or Base UI components unless reused in 3+ places with genuinely different logic.
- Use react-hook-form + shadcn `<Form>` for all forms. No custom form state.
- No HOCs, render-prop wrappers, or context for state solvable with props or a lifted parent.

| Instead of | Use |
|---|---|
| Custom `PrimaryButton` wrapping `Button` | `<Button variant="default">` |
| Custom modal component | `<Dialog>` from shadcn |
| Custom dropdown | `<Select>` or `<DropdownMenu>` from shadcn |
| Custom form state hook | `useForm()` + shadcn `<Form>` |
| Context for state shared between 2 siblings | Lift to common parent |

For frontend files, see `.github/instructions/design-skills.instructions.md` for the full rule set covering forms, state, Tailwind, and TypeScript.

### Customer Feature

The customers feature supports viewing person profiles, managing subscriptions, and onboarding new customers via a multi-step wizard.

## Design Process

When creating, editing, reviewing, or refactoring frontend UI code (`assets/src/**/*.{tsx,ts,css}`), load the relevant design skills from `.agents/skills/` before writing code. Design quality is a first-class requirement — never produce generic or template-like UI.

### Core Skills (Load for Any UI Task)

- **claude-frontend-design** — Production-grade interface aesthetics. Ensures distinctive, polished output.
- **ui-ux-pro-max** — Design system intelligence: styles, palettes, typography, spacing, and 99 UX guidelines.
- **vercel-react-best-practices** — React performance patterns from Vercel Engineering.

### Compositional Skills (Load When Relevant)

- **vercel-composition-patterns** — Load when designing component APIs, refactoring prop-heavy components, or building reusable compound components.
- **vercel-react-view-transitions** — Load when implementing page transitions, route animations, or shared element animations.
- **web-design-guidelines** — Load when auditing UI quality, reviewing accessibility, or checking design compliance.
- **shadcn** — Load when adding, searching, or managing shadcn/ui components via the CLI, working with the component registry, or using presets.
- **shadcn-ui** — Load when building or customizing UI with shadcn/ui components, including component discovery, composition, and integration best practices.

### Specialized Skills (Load When Explicitly Needed)

- **ux-heuristics** — Load for usability audits, form usability reviews, or information architecture evaluation.
- **hooked-ux** — Load when designing engagement loops, notification strategies, streaks, or retention features.

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
