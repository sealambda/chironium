---
name: sprint
description: >-
  Run a Chironium autonomous sprint from one or more tasks (features, fixes, reviews).
  This is the thin project binding over the installed plugins — the execution engine is
  `superpowers` (git worktrees, planning, TDD, two-stage review); this skill ties it to
  Chironium's stack, quality gates, the GraphQL contract seam, and PHI guardrails. Run as
  `/sprint <tasks>` in your main session when handing over PM-level work end-to-end.
---

# Chironium sprint (orchestration binding)

The **execution engine is the `superpowers` plugin** (brainstorm → git worktrees → plan →
subagent execution → TDD red-green-refactor → two-stage review → finish). This skill is the
thin Chironium-specific binding on top. Run `/sprint <tasks>` in your main session.

> **Depth-1 constraint:** orchestrate from the main session — subagents cannot spawn subagents.

Tasks are in `$ARGUMENTS` (`;` or newline separated). If empty, ask the user for them.

## Installed toolchain (see `.claude/README.md`)
- **Engine:** `superpowers` — worktrees, plan, execute, TDD, review, finish.
- **Backend:** `elixir-phoenix` (oliver-kriska) — `/phx:plan|work|review|audit`, Iron Laws,
  compile/format/credo hooks, Tidewave MCP — plus the house-style Ash rules.
- **Frontend:** `frontend-mobile-development` + `typescript-lsp` (live TS diagnostics) + house-style.
- **Review:** `code-review` + `pr-review-toolkit`.
- **Security/compliance:** `security-guidance` (always-on hooks) + `security-compliance` (HIPAA)
  for PHI / authz / migrations.
- **Git/PR:** `commit-commands` + `github`.
- **Authoring/tuning:** `plugin-dev` + `skill-creator` (use its eval loop to fix sub-agent or
  skill mis-dispatch).

## Always
Read `skills/chironium-house-style/SKILL.md` first. Never weaken Ash policies, `:context`
multitenancy, or care-team visibility. Route authz / multitenancy / migration / money / PHI
changes through security review **and a human merge gate**.

## Workflow (Chironium specifics layered on the superpowers engine)
0. **Triage** each task: type, scope, **risk** (PHI/authz/migration/money?), specialists, model, effort.
1. **DAG + seams:** backend = `lib/`, frontend = `assets/src/features/*`. Independent tasks run in
   parallel; dependent tasks wait.
2. **Contract-first (cross-cutting):** land the Ash resource/action and regenerate
   `priv/schema.graphql` on the sprint branch first, then `pnpm --dir assets gql:generate` so the
   frontend consumes typed contracts. The GraphQL schema is the seam that keeps BE/FE parallel work
   conflict-free.
3. **Execute** via superpowers, one **worktree per task** (branch `sprint/<slug>/<task>`), using the
   backend/frontend specialists. `typescript-lsp` gives live frontend diagnostics; the oliver-kriska
   hooks compile/format/credo the backend as it edits.
4. **Per-worktree gate:** backend — `mix compile --warnings-as-errors`, `mix format
   --check-formatted`, `mix credo --strict`, relevant `mix test`; frontend — `pnpm --dir assets
   quality` + `pnpm --dir assets test`.
5. **Integrate into the sprint branch sequentially:** rebase each task branch onto the latest sprint
   head, merge **one at a time**, and **re-run the gates on the sprint branch after every merge**
   (worktree-green ≠ integration-green — semantic conflicts hide here). Resolve conflicts/breakage
   before the next merge; keep the sprint branch green, never force-merge.
6. **Review lane:** `code-review` + `pr-review-toolkit` on each diff; high-risk diffs (authz/PHI/
   migration) → `security-compliance` + human sign-off. `security-guidance` runs automatically on
   edits/commits.
7. **Finalize:** full gates green on the sprint branch (mirror `pr-validation.yml`: `mix quality`,
   `mix test`, `pnpm --dir assets quality`, `pnpm --dir assets test`, Playwright for UI) →
   `/commit-push-pr` → PR. A human merges (no auto-merge to `main`). Summarize tasks, gate results,
   and audit findings in the PR body.

## Model & effort
- **Opus / high:** this orchestrator, integration/reconciliation, and authz/PHI/migration review.
- **Sonnet / medium:** implementation specialists, routine review, QA.
- **Haiku-first:** audit/triage breadth, escalating on signal.

## Notes
- Worktrees don't share `_build` / `deps` / `node_modules`; warm them or budget setup time per task.
- If agents mis-route (wrong specialist picked), tune descriptions with the `skill-creator` eval loop.
