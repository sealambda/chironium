# Chironium autonomous sprint system

A multi-agent system for running unattended sprints in this repo: you hand over one or
more tasks (features, fixes, reviews) and a master orchestrator dispatches specialist
agents on isolated git worktrees, reconciles their work into a sprint branch, audits the
code it touches, and opens a PR for you to merge.

This is the **project-local** half of the design (see the architecture proposal). The
reusable, stack-agnostic pieces are authored here as skills now and will be **promoted**
into the `sealambda/claude-plugins` marketplace from a session scoped to that repo.

## How to run

```
/sprint <one or more tasks, separated by ; or newlines>
```

The orchestrator (the `sprint` skill, run in your main session) then triages, schedules,
dispatches, integrates, reviews, and finalizes. See `skills/sprint/SKILL.md`.

## Layout

```
.claude/
  skills/
    sprint/                     # the orchestrator workflow (/sprint)
    chironium-house-style/      # project conventions + authz/multitenancy invariants
    backend-engineer/           # generic role process + checklist  ─┐
    frontend-engineer/          #                                     │ promotable to
    qa-engineer/                #                                     ├ claude-plugins
    code-auditor/               #                                     │ (stack-agnostic)
    security-reviewer/          #                                     │
    integration-reconciler/     # ────────────────────────────────────┘
  agents/                       # thin specialists: model + tools + compose the skills
    chironium-{backend,frontend,qa,code-auditor,security-reviewer,integrator}.md
  hooks/
    guard-bash.sh               # blocks catastrophic shell commands
  settings.json                 # wires the guard hook
  sprint/runs/                  # run reports land here
```

**Composition:** each `agents/chironium-*.md` is a thin wrapper that sets the model and
tool allowlist, then reads and applies (a) `chironium-house-style` and (b) its generic
role skill. The generic role skills carry no stack specifics, so they promote cleanly to
the marketplace; `chironium-house-style` stays project-local.

## Model & effort policy

- **Opus:** orchestrator, integrator, and any review of authz / multitenancy / migrations
  / money / PHI.
- **Sonnet:** implementation specialists, routine review, QA.
- **Haiku → escalate:** audit/triage breadth.

## Guardrails

- Authorization, `:context` multitenancy, and care-team visibility are invariants — any
  diff touching them routes through `chironium-security-reviewer` + a human merge gate.
- Migrations / money / PHI are high-risk and human-gated.
- `hooks/guard-bash.sh` blocks catastrophic commands (e.g. `rm -rf` of key paths,
  force-push to `main`). Enable hooks by trusting them when Claude Code prompts.

## Known items to validate in the first pilot

- **Worktree setup cost:** fresh worktrees don't share `_build` / `deps` / `node_modules`;
  gates may need `mix deps.get` / `pnpm install` per worktree. Warm and reuse if possible.
- **Worktree branch persistence:** confirm specialist branches survive for the integrator
  to merge; specialists commit to an explicit `sprint/<slug>/<task-slug>` branch to be safe.
- **Experimental features:** "agent teams" (shared task list + mailbox) and scripted
  "workflows" are optional accelerations — validate against current docs before relying on
  them. The system here uses only stable primitives (subagents + worktree isolation + hooks).

## Promotion path (later, from a claude-plugins-scoped session)

Move `skills/{backend,frontend,qa,code-auditor,security-reviewer,integration-reconciler}`
and `skills/sprint` into marketplace plugins; keep `chironium-house-style`, the
`agents/chironium-*` wrappers, hooks, and `settings.json` here. The agents already
reference role skills by name, so they keep working once those skills are installed via the
marketplace.
