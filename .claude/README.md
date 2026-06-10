# Chironium autonomous sprint system

A **reuse-first** multi-agent system: hand over tasks (features / fixes / reviews) and a master
orchestrator (your main session) drives battle-tested community + Anthropic-official Claude Code
plugins to plan, implement on isolated git worktrees, review, and open a PR — with PHI guardrails.
We **assemble** proven plugins and author only thin project-specific glue.

## What's wired (declared in `.claude/settings.json`)

Trusting this repo in Claude Code installs the marketplaces (`extraKnownMarketplaces`) and the
enabled set (`enabledPlugins`) below, per-user on first trust. Every slug here is verified against
its marketplace manifest.

**Foundations / authoring**
- `plugin-dev@claude-code-plugins` — author, validate, and package our own plugins/skills.
- `example-skills@anthropic-agent-skills` — includes **skill-creator** (write → eval → optimize
  skills) and **webapp-testing** (Playwright).

**Orchestration engine**
- `superpowers@superpowers-marketplace` — brainstorm → git worktrees → plan → subagent execution →
  TDD (red-green-refactor) → two-stage review → finish. This is the sprint engine; our `sprint`
  skill is a thin binding over it.

**Review / security / git**
- `code-review` + `pr-review-toolkit` (`@claude-code-plugins`) — correctness + multi-lens PR review.
- `security-guidance@claude-code-plugins` — always-on security hooks (edit warnings, Stop diff
  review, commit reviewer).
- `security-compliance@claude-code-workflows` — HIPAA/SOC2/GDPR compliance + secrets scanning (PHI).
- `commit-commands@claude-code-plugins` + `github@claude-plugins-official` — commit/push/PR + GitHub MCP.

**Code intelligence**
- `typescript-lsp@claude-plugins-official` — live TS/React diagnostics as agents edit.
- `expert-lsp@chironium-local` — **Expert** Elixir language server (`expert-lsp/expert`) for live
  `.ex/.exs/.heex` diagnostics; shipped as a project-local plugin under `.claude/local-marketplace/`.

**Stack specialists**
- `elixir-phoenix@oliver-kriska` — heavyweight Elixir/Phoenix/Ash engine (25 agents,
  `/phx:plan|work|review|audit`, Iron Laws, compile/format/credo hooks, Tidewave MCP).
- `frontend-mobile-development@claude-code-workflows` — frontend specialist depth.

**Project glue we author (here, not the marketplace)**
- `skills/chironium-house-style` — Ash/Phoenix + frontend conventions and the authz/multitenancy
  invariants agents must never weaken.
- `skills/sprint` — thin binding tying superpowers + the specialists to Chironium gates, the GraphQL
  contract seam, and PHI guardrails.
- `hooks/guard-bash.sh` — PreToolUse guard that blocks catastrophic `rm -rf`, force-push to
  `main`/`master`, `--no-verify`, and piping remote scripts into a shell.
- `local-marketplace/expert-lsp` — project-local plugin wiring the **Expert** Elixir LSP.

## Prerequisites
- **Expert (Elixir LSP)** needs the `expert` binary on PATH — download from
  [expert-lsp/expert releases](https://github.com/expert-lsp/expert/releases) (requires the Elixir
  toolchain). Until it's present the Elixir engine still works via oliver-kriska's compile/format/credo
  hooks + your `mix quality` gates; only live in-editor diagnostics wait on the binary.
- **`typescript-lsp`** needs `typescript-language-server` on PATH (`pnpm add -g typescript
  typescript-language-server`, or project-local).
- **`elixir-phoenix`** integrates the Tidewave MCP and ships hooks — review them before first run.

## Web-session provisioning

`.claude/hooks/session-start.sh` (a `SessionStart` hook) installs the mise-pinned toolchain
(Erlang/Elixir/Node/pnpm) + dependencies so web sessions can run the gates. It is **web-only**
(`CLAUDE_CODE_REMOTE`), idempotent, and synchronous; the first run compiles Erlang/OTP (slow, then
cached by the container).

**Network policy — required allowlist.** The hook (and `mix`/`pnpm`) need outbound access to:
`mise.run` (or `github.com` release assets), `github.com` / `codeload.github.com` /
`objects.githubusercontent.com`, **`repo.hex.pm` + `builds.hex.pm` (Elixir packages — required)**,
`nodejs.org`, and `registry.npmjs.org`. If the Claude Code web environment uses a restrictive
network policy, allowlist these when creating the environment. **Without Hex, `mix deps.get` cannot
run and the backend gates are unavailable** — this is an environment setting, not something the repo
can fix.

## Using it
- `/sprint <tasks>` — the Chironium binding (triage → plan → worktrees → integrate → review → PR).
- Or drive `superpowers` directly (`/brainstorm`, plan, execute) for a single thread of work.

## Security note (PHI)
You chose to adopt the full recommended set now. **Third-party plugins (superpowers, oliver-kriska,
wshobson) run with your privileges** — re-vet their hooks/manifests on each `claude plugin update`.
The Anthropic tier (`claude-code-plugins`, `claude-plugins-official`, `anthropic-agent-skills`) is
the safest. `security-guidance` + `security-compliance` + `guard-bash.sh` are the standing safety
net; authz / multitenancy / migration diffs still require human review and merge (no auto-merge to
`main`).

## Curation & optional add-ons
The enabled set is deliberately curated to limit agent-dispatch ambiguity. Also available — enable
with `claude plugin install <plugin>@<marketplace> --scope project`:
- `claude-code-plugins`: `feature-dev`, `frontend-design`, `hookify`.
- `claude-code-workflows`: `backend-development` (GraphQL), `tdd-workflows`, `unit-testing`,
  `comprehensive-review`, `full-stack-orchestration`, `functional-programming`, `git-pr-workflows`,
  `database-migrations`, `backend-api-security`.
- `oliver-kriska`: `catchup`.
- `anthropic-agent-skills`: `claude-api`, `document-skills`.

## Promotion path
Project glue (house-style, the sprint binding, the guard hook) stays here. If a piece becomes
reusable across products, package it with `plugin-dev` and publish to `sealambda/claude-plugins`.
