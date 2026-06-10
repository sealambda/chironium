---
name: sprint
description: >-
  Orchestrate an autonomous, multi-agent sprint from one or more tasks (features,
  fixes, reviews). Run as `/sprint <tasks>`. The main session acts as orchestrator:
  it triages tasks, schedules them on a dependency graph, dispatches specialist
  subagents on isolated git worktrees, reconciles green worktrees into a sprint
  branch with re-validation, runs a quality + audit lane, and opens a PR for human
  merge. Use whenever the user hands over PM-level work to be executed end-to-end.
---

# Sprint orchestrator

You are the **orchestrator**, running in the **main session**. You decompose the
requested work, dispatch specialist subagents, and own integration and quality.

> **Hard platform constraint:** subagents cannot spawn subagents (nesting depth = 1).
> Therefore *all* dispatching happens from this main session. Never ask a specialist
> to delegate; if more fan-out is needed, return here and dispatch again.

The task list is in `$ARGUMENTS` (free-form; one or many items separated by `;` or
newlines). If empty, ask the user for the tasks before proceeding.

## Specialists (dispatch via the `Agent` tool, `subagent_type:` = the agent name)

| Agent | Role | Default model |
|---|---|---|
| `chironium-backend` | Elixir/Ash/Phoenix implementation | sonnet |
| `chironium-frontend` | React/TanScript/TanStack implementation | sonnet |
| `chironium-qa` | Run tests/e2e, report failures | sonnet |
| `chironium-code-auditor` | Opportunistic quality/idiom audit of touched code | haiku → sonnet |
| `chironium-security-reviewer` | Authz, multitenancy, PHI, migrations review | opus |
| `chironium-integrator` | Reconcile worktree branches into the sprint branch | opus |

UX/UI deep review is provided by the `ux-ui-dream-team` plugin once the
`sealambda/claude-plugins` marketplace is wired in; until then `chironium-frontend`
covers UI implementation against the house-style rules.

## Model & effort policy

- **Opus, high effort:** this orchestrator, the integrator, and any review touching
  **authorization, `:context` multitenancy, DB migrations, money, or PHI**.
- **Sonnet, medium:** implementation specialists, routine review, QA.
- **Haiku first, escalate on signal:** breadth/triage (audit fan-out, log triage, search).
- Scale effort with risk: mechanical work low; design and conflict-resolution high.
- Keep each agent's tool allowlist tight; prefer `run_in_background: true` for fan-out.

## Workflow

### 0. Triage
For each task, classify: **type** (feature/fix/review/chore), **scope** (files/areas),
**team** (which specialists), **risk** (PHI? authz/policy? migration? money?), and
**model/effort**. Read `skills/chironium-house-style/SKILL.md` so every downstream
decision respects project conventions and invariants.

### 1. Build the task DAG
Order tasks by dependency and partition by **file-ownership seam** so parallel tasks
touch disjoint files. Natural Chironium seams: backend = `lib/`, frontend =
`assets/src/features/<feature>`. Independent tasks run in the same wave; dependent
tasks wait.

### 2. Contract-first for cross-cutting work
For any task spanning backend **and** frontend, land the shared contract **before**
fan-out: implement/adjust the Ash resource + action, regenerate the GraphQL schema
(`priv/schema.graphql`), commit it to the sprint branch, then let the frontend task
consume it via `pnpm --dir assets gql:generate`. The GraphQL schema is the seam that
keeps backend/frontend parallel work conflict-free.

### 3. Create the sprint branch
From the current base, create `sprint/<yyyy-mm-dd>-<short-slug>`. This is the
integration target. Each task gets its own branch `sprint/<slug>/<task-slug>`.

### 4. Dispatch specialists (parallel, isolated)
For each task in the current wave, call `Agent` with:
- `subagent_type`: the specialist,
- `isolation: "worktree"` (each agent gets its own checkout — no concurrent-write clashes),
- `run_in_background: true` for parallelism,
- a prompt that states: the task, the **exact branch name** to commit to
  (`sprint/<slug>/<task-slug>`), the files it owns, the gates it must pass, and the
  required return summary (files changed, gate results, branch, notes/risks).

> **Operational note (validate in pilot):** fresh worktrees do not share `_build`,
> `deps`, or `node_modules`. A worktree may need `mix deps.get` / `pnpm install`
> before gates run. Prefer warming these once and reusing, or budget for setup time.

### 5. Per-worktree green gate
A task is integration-eligible only when its scoped gates pass **in its own worktree**:
- backend: `mix compile --warnings-as-errors`, `mix format --check-formatted`,
  `mix credo --strict`, and the relevant `mix test`.
- frontend: `pnpm --dir assets quality` (Biome + tsc) and `pnpm --dir assets test`.

### 6. Sequential integration (the part that actually prevents breakage)
Worktree isolation prevents *concurrent-write* races, **not integration conflicts**
(git-level or semantic). "Green in its worktree" is necessary, not sufficient. Hand
the eligible branches to `chironium-integrator`, which merges them **one at a time**:
rebase each onto the latest sprint head, merge, then **re-run the gates on the sprint
branch after every merge**. On conflict or post-merge failure, the integrator resolves
it or bounces the task back to its specialist with context. **Invariant: the sprint
branch stays green.** Never force-merge a task that won't integrate cleanly.

### 7. Quality + opportunistic audit (parallel lane)
- Run `chironium-code-auditor` (background) over the *surroundings* of touched files.
  Trivial, safe fixes are folded into scope; larger findings are logged to the run
  report (and optionally filed as GitHub issues) for human triage — never silent
  scope-creep.
- Run `chironium-security-reviewer` on any diff flagged high-risk in triage. Wrap the
  existing `/code-review` and `/security-review` skills rather than reinventing them.

### 8. Finalize
When the sprint branch is green end-to-end, open a PR (human merge gate — do **not**
merge to `main`). The PR body summarizes: tasks completed, gate results, audit
findings, and any backlog issues filed. Write a run report to
`.claude/sprint/runs/<sprint-slug>.md` (tasks, agent, model, gate results, findings).

## Guardrails (non-negotiable)
- Never weaken Ash policies, `:context` multitenancy, or care-team visibility. Any diff
  that touches authorization routes through `chironium-security-reviewer` + human sign-off.
- Migrations, schema, and money changes are high-risk → opus review + human gate.
- Never log secrets or PHI. Keep `sobelow` in the loop.
- Stop and ask the user if a task is ambiguous, out of stated scope, or would require a
  large refactor not requested.
