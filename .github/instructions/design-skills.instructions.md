---
name: "Frontend Design Quality"
description: "Ensures design skills are consulted when editing frontend files."
applyTo: "assets/src/**/*.{tsx,ts,css}"
---

Load design skills from `.agents/skills/` before writing code. At minimum: `claude-frontend-design` and `ui-ux-pro-max` for visual quality, `vercel-react-best-practices` for React patterns, `shadcn-ui` when building with shadcn/ui components, `shadcn` for CLI operations. See AGENTS.md Design Process for the full skill roster.

## Before writing any UI component

1. Run `pnpm shadcn search <name>` to check if a shadcn component covers the requirement.
2. Look up current documentation for the component or library you will use:
   - **shadcn/ui components** — call `mcp_io_github_ups_get-library-docs` with library ID `/shadcn-ui/ui` and the component name as the topic (e.g. `"Button component usage variants"`).
   - **Any other library** — call `mcp_io_github_ups_resolve-library-id "<library name>"` to get the Context7 ID, then call `mcp_io_github_ups_get-library-docs` with that ID. If no Context7 entry exists, fetch the official docs URL with `fetch_webpage`.
3. Implement exactly what the retrieved documentation shows. Do not rely on memorized patterns — the live docs are the source of truth.

Follow the decision ladder from AGENTS.md Canonical UI Patterns: shadcn → Base UI → well-adopted community registry → custom. Custom is only justified when the functional requirement cannot be met by existing components — style preference is not a justification.

## Rules

**Components:** Use `variant`, `size`, and `className` props before touching component source. Never wrap shadcn or Base UI in a new component unless reused in 3+ places with genuinely different logic. When component source must be changed, make the minimal surgical edit.

**Forms:** Always use react-hook-form + shadcn `<Form>`. Never write custom form state or controlled input wiring outside this pattern.

**State:** No HOCs, no render-prop wrappers, no context for concerns solvable with props or a lifted parent. Context is for data that is genuinely global or crosses many unrelated tree branches.

**Tailwind:** No arbitrary values (`text-[14px]`, `min-h-[44px]`). No inline styles or CSS variables. Only standard Tailwind tokens; extend `tailwind.config` for missing values.

**TypeScript:** Prefer inference over explicit types. Do not annotate types the compiler already infers. Use `satisfies` over `as` for type narrowing.
