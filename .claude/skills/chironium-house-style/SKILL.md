---
name: chironium-house-style
description: >-
  Chironium's project-specific conventions and invariants for Elixir/Ash/Phoenix
  backend and React/TypeScript/TanStack frontend work. Read and apply this before
  writing or reviewing any code in this repo. Covers Ash idioms, the GraphQL contract
  seam, frontend import/style rules, quality gates, and the authorization/multitenancy
  invariants that must never be weakened.
---

# Chironium house style

This is a multi-tenant, **FHIR R5-aligned healthcare platform** (PHI). Correctness,
authorization, and tenant isolation matter more than speed. When in doubt, stop and ask.

## Backend — Elixir / Ash 3 / Phoenix

- **Ash-first.** Domain logic lives in Ash resources, not ad-hoc modules. Resources
  compose the base mixins in `lib/chironium/base_resources/`: `Identifiable` →
  `Auditable` → `Tenantable` (most clinical resources `use Chironium.BaseResources.Tenantable`,
  which adds `:context` multitenancy + paper-trail). Register resources in their domain
  (`lib/chironium/{accounts,health,crm,terminology,subscriptions}.ex`).
- **Actions are declarative.** Prefer named actions with `change`/`validate`/`prepare`
  over imperative code. Follow the existing patterns (see `lib/chironium/health/observation.ex`
  and `task.ex`): typed factory actions, `set_attribute` for codes, JSONB `@>` filters
  for typed reads, calculations for derived fields.
- **FHIR alignment.** Model FHIR resource shapes; reuse embedded datatypes in
  `lib/chironium/datatypes/` (Coding, CodeableConcept, Quantity, Period, …). Use LOINC/
  SNOMED codes consistently with existing constants.
- **The GraphQL schema is the contract.** The API is auto-generated from resources into
  `priv/schema.graphql`. After changing any resource/action that affects the API,
  regenerate the schema so the frontend can codegen against it.
- **Migrations** go through Ash codegen (`mix ash.codegen <name>`), not hand-written Ecto,
  unless there's a specific reason. Migrations are **high-risk** — flag for review.
- **Quality gate:** `mix quality` (compile `--warnings-as-errors`, `format --check-formatted`,
  `credo --strict`, `sobelow`, `dialyzer`) and `mix test` (which runs `ash.setup`). Run
  `mix format` before committing. The formatter uses Spark/Absinthe/LiveView plugins.

## Frontend — React 19 / TypeScript / TanStack / Biome

Authoritative rules live in the repo root `AGENTS.md`; the essentials:

- **pnpm only.** Never npm/yarn/bun/npx. Run binaries via `pnpm <bin>` or `pnpm exec`.
- **Imports (three-tier, blank-line separated):** external packages → `@/` absolute (any
  cross-directory import) → `./` same-directory only. **Never use `../`.** Named exports
  only (no default exports). ESM only.
- **UI:** one responsive component using Tailwind `lg:` breakpoints — no JS branching for
  layout. Prefer inline-in-cards over overlays/sheets/drawers. Use only standard Tailwind
  typography tokens (no arbitrary `text-[Npx]`). Use `date-fns` (`formatDistanceToNowStrict`
  with `getDateLocale()`) for locale-aware relative time.
- **Data:** typed GraphQL via `gql.tada` (`graphql()` documents + `requestGraphql`, which
  carries `organizationId`). Keep pure **selector** functions separate from mutations
  (see `features/customers/api/anthropometry-api.ts`). Feature-sliced layout under
  `assets/src/features/*` with shared code in `assets/src/shared/*`.
- **Never edit generated files:** `src/routeTree.gen.ts`, `src/graphql-env.d.ts`,
  `src/paraglide/`. Regenerate types with `pnpm --dir assets gql:generate`.
- **Quality gate:** `pnpm --dir assets quality` (Biome + tsc), `pnpm --dir assets test`
  (Vitest), and `pnpm --dir assets e2e` (Playwright; needs the server on :4000) for UI work.

## Authorization & multitenancy invariants (never weaken)

- Tenant isolation is `multitenancy strategy :context`; every tenant-scoped action runs
  inside an org context. Do not bypass it.
- Visibility is policy-enforced: a `bypass PowerUser` plus `FilterCheck`s such as
  `PatientVisibleToActor` / `PatientSubjectVisibleToActor` (a practitioner sees a patient
  only via an active care team). Do not loosen these filters or add `authorize_if always()`
  outside an explicit, reviewed reason.
- `authorize?: false` is only for trusted internal flows (e.g. derived observations) — never
  on a path reachable from user input without review.
- Any diff touching policies, checks, multitenancy, migrations, money, or PHI must go through
  `chironium-security-reviewer` and a human gate.

## Writing standards (from AGENTS.md)
Comments explain **why**, not what; remove obvious/outdated/placeholder comments. Full
sentences end with a period. Consistent terminology: "practitioner" (not "professional");
body measurements are **anthropometry** (one flat concept, all fields optional). Error
messages state what went wrong and how to fix it. Delete dead code (verify zero importers).
