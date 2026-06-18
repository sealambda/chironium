# Frontend Code-Quality / SCA / SAST Stack — chironium vs offerdrive-cms

> **Date:** 2026-06-17
> **Scope:** chironium **frontend** (`assets/`) only. Backend (Elixir) is a separate future sweep.
> **Constraints:** blocking gates + upfront remediation; **FOSS only** — no proprietary/freemium SaaS
> with money gates or private-company lock-in.
> **Reference:** `~/Projects/offerdrive-cms`, a mature TypeScript monorepo already hardened by the team.

The discrepancies below come from three things: **scope** (chironium = frontend-only, no infra/shell/IaC),
**shape** (chironium = single package, not a multi-package monorepo), and **FOSS-purity** (one tool swap to
avoid a relicensed ruleset).

## Category-by-category: offerdrive-cms → chironium

| Concern | offerdrive-cms (reference) | chironium (picked) | Δ | Why the discrepancy |
|---|---|---|---|---|
| Lint / format | Biome 2.5.0 | Biome 2.4.13 (already present) | ✅ same | Same engine. Minor version lag — Renovate will bump it. |
| Complexity gate | Biome cognitive complexity = 15 (error) | Biome cognitive complexity = 15 (flip warn→error) | ✅ same | Identical Sonar-standard threshold. |
| **God-file gate** | *(none — relied on complexity only)* | **Biome `noExcessiveLinesPerFile` (maxLines 400)** | ➕ added | You explicitly asked for "god file" detection. offerdrive never enabled a line-count rule; we turn on Biome's native one (verified present in 2.4.13). |
| Type safety | TypeScript 6 strict | TypeScript 6 strict | ✅ same | Already strict; we also add `tsc` to the pre-push hook (currently missing). |
| Duplication | jscpd 5.0.9 (5% / minTokens 70) | jscpd (5% / minTokens 70) | ✅ same | Same canonical tool + same proven thresholds. |
| Dead code | Knip 6.17.1 | Knip | ✅ same | Same modern winner. |
| **Architecture / cycles** | *(none)* | **dependency-cruiser** | ➕ added | chironium has a clean `features/*` layout worth protecting (no-circular / no-orphan / cross-feature boundaries). offerdrive didn't have this; it's a strict upgrade. |
| SCA (dep CVEs) | OSV-Scanner 2.3.8 | OSV-Scanner | ✅ same | Same Google/OpenSSF scanner. Replaces chironium's current `pnpm audit`-only gate. |
| **SAST** | **Semgrep 1.166.0** | **Opengrep** | 🔄 **changed** | The one real swap. Semgrep relicensed its rule packs (Dec 2024) under a restrictive license tied to its SaaS. Opengrep is the community LGPL fork that keeps the rules FOSS and is community-governed — directly matches the "no private-company money gate" rule. Drop-in compatible (same CLI/rules/SARIF). |
| Secrets | Gitleaks 8.30.1 | Gitleaks | ✅ same | Same MIT scanner, staged + full-history. |
| Workflow security | actionlint 1.7.12 + zizmor 1.25.2 | actionlint + zizmor | ✅ same | Same canonical pair. |
| Commit governance | commitlint 21 + conventional | commitlint + conventional | ✅ same | Identical. |
| Dependency automation | Renovate (self-hosted) | Renovate (self-hosted) | ✅ same | Same FOSS self-hosted choice over Dependabot. |
| Toolchain pinning | mise | mise (already present, extend) | ✅ same | Already pinning elixir/erlang/node/pnpm; we add the new binaries. |
| Git hooks | lefthook 2.1.9 | Lefthook (migrate off Husky) | ✅ same (chironium catches up) | offerdrive already uses Lefthook; chironium is on Husky pre-push-only. Migrating aligns it + gives staged scoping + parallel. |
| Task orchestration | **Turbo 2.9.18** | **pnpm scripts (no Turbo)** | ➖ dropped | Turbo's value is caching across *many* packages. chironium's frontend is a **single** package in `assets/` — Turbo would be pure overhead. Root already orchestrates via `pnpm --filter`. |
| CI structure | ci.yml + quality.yml + security.yml + infra.yml + renovate.yml | pr-validation.yml (keep) + quality.yml + security.yml + renovate.yml | partial | Same separation-of-concerns, minus `infra.yml` (see below). |

## Things in offerdrive we deliberately did **not** port (scope, not quality)

| offerdrive piece | Ported? | Reason |
|---|---|---|
| **Trivy** (IaC misconfig + license scan) | ➖ no | offerdrive scans OpenTofu/`infra/`. chironium's frontend has no IaC. Belongs to the **future backend/infra sweep**. |
| **tflint + OpenTofu validate** (`infra.yml`) | ➖ no | No Terraform/OpenTofu in scope. |
| **shellcheck + shfmt** | ➖ no | Shell-script hygiene — not frontend; revisit in the backend sweep. |
| SOPS-encrypted secrets, CODEOWNERS, PR template | ➖ deferred | Governance niceties; not part of the "deterministic code-quality scanning" ask. Easy add-ons later. |

## Summary — the discrepancies in one breath

- **3 strict upgrades over the offerdrive template:** god-file line gate, dependency-cruiser (architecture),
  and `tsc` in the hook — offerdrive lacks all three.
- **1 intentional swap:** Semgrep → **Opengrep**, purely to honor "FOSS, no private-company gate."
- **3 scope drops:** Trivy / tflint / shell + Turbo — because chironium's frontend isn't an IaC repo and isn't
  a multi-package monorepo.
- **Everything else is identical** (Biome, jscpd, Knip, OSV-Scanner, Gitleaks, actionlint, zizmor, commitlint,
  Renovate, mise, Lefthook).

**Net:** chironium's frontend gate is offerdrive's stack **minus the infra/shell/monorepo pieces that don't
apply, plus three quality upgrades, with one FOSS-purity swap.**

## Tool licenses (FOSS verification)

| Tool | License | Tool | License |
|---|---|---|---|
| Biome | MIT/Apache-2.0 | OSV-Scanner | Apache-2.0 |
| jscpd | MIT | Opengrep | LGPL-2.1 |
| Knip | ISC | Gitleaks | MIT |
| dependency-cruiser | MIT | actionlint | MIT |
| TypeScript | Apache-2.0 | zizmor | MIT/Apache-2.0 |
| commitlint | MIT | Renovate (self-hosted core) | AGPL-3.0 |
| Lefthook | MIT | mise | MIT |

**Rejected (fail the FOSS / no-money-gate test):** SonarQube Community (source-available bundled analyzers),
GitHub CodeQL (paid GHAS for private repos), Snyk / Socket.dev / SonarCloud / GitGuardian (freemium SaaS).
