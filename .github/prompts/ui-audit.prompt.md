---
name: ui-audit
description: Scopes unstaged UI changes and dispatches parallel sub-agents armed with Playwright to conduct deep Visual, UX, and Architectural audits.
agent: agent
argument-hint: "[dev-server-url] — defaults to http://localhost:4000"
---

# UI Audit Orchestrator

You are a senior product design architect orchestrating a comprehensive swarm of UI/UX audits. Work through the phases below in order. Do not skip phases. You will delegate the deep work to parallel sub-agents using the `runSubagent` tool.

## Phase 0 — Auth Check

Before doing anything else, verify that the audit auth state is present:

```bash
ls assets/e2e/.auth/audit-sso.json 2>/dev/null && echo "AUTH OK" || echo "AUTH MISSING"
```

If the output is **AUTH MISSING**, stop and instruct the user:

> Please run `pnpm --dir assets audit:auth` in your terminal. A Chromium browser will open — complete Google SSO. The script will save your session automatically. Come back here once it prints "✓ Session saved".

Wait for the user to confirm before continuing. Do not proceed until auth is confirmed present.

## Phase 1 — Discover Scope

The dev server URL is: **${input:devServerUrl:http://localhost:4000}**

Run the following commands and record the output:

```bash
git diff --stat HEAD
git diff HEAD -- '*.tsx' '*.ts' '*.css'
```

1. List every changed file and identify the affected UI surfaces (pages, components, layouts, styles).
2. Map each changed file to the route(s) or page(s) it renders in. Reference `assets/src/routeTree.gen.ts`.
3. Determine the target URLs to audit based on these routes (e.g., `http://localhost:4000/customers/123`). If no frontend files changed, state this and stop.

## Phase 2 — Dispatch the Swarm (Parallel Sub-Agents)

Invoke the `runSubagent` tool to spawn the following three sub-agents **IN PARALLEL**. Inject the changed files, target URLs, and base URL into every sub-agent prompt.

CRITICAL SCOPE RULE: Every sub-agent must limit findings strictly to the components and DOM nodes affected by `<changed_files>`. They will fail the assignment if they report on global page typography, unedited legacy elements, or unchanged layout shells.

---

### Sub-Agent 1: Visual Design & Components

**Prompt structure to pass:**
- Load skills: `playwright-cli`, `claude-frontend-design`, `ui-ux-pro-max`, `shadcn`, `shadcn-ui`.
- Inject: `<changed_files>`, `<target_urls>`, `<base_url>`.
- Goal: Write `assets/audit-visual.mjs` that imports from `./audit-lib.mjs`. Use `requireAuthState()`, `launchBrowser()`, `createAuthContext()`, `openPage()`, `navigate()`, `snap()`, `snapAnnotated()`, `captureOverlay()`, and `domInventory()`. Do NOT reimplement auth, screenshots, or navigation. The script must:
  1. Call `requireAuthState()` at the top — exit with a clear error if auth is missing.
  2. Use `discoverCustomerIds()` when customer IDs are needed — never hardcode UUIDs.
  3. Navigate to each target URL and take fold + full-page screenshots scoped to the changed components (use CSS selectors from `<changed_files>` to identify the relevant DOM nodes).
  4. Capture open states of any interactive components in the diff (dialogs, menus, sheets) using `captureOverlay()`.
  5. Call `domInventory()` on each page and `saveReport()` the result.
  6. Save all screenshots to `screenshots/audit-visual-*.png`.
  Then run the script: `node assets/audit-visual.mjs`. Analyze the screenshots and DOM reports. Assess spacing, typography, contrast, and shadcn component canonicality ONLY for the modified areas.
- Return: A markdown section titled **Visual & Component Findings** with screenshot references, specific findings, and remediation steps scoped to the diff.

---

### Sub-Agent 2: UX & Heuristics

**Prompt structure to pass:**
- Load skills: `playwright-cli`, `ux-heuristics`, `hooked-ux`, `web-design-guidelines`.
- Inject: `<changed_files>`, `<target_urls>`, `<base_url>`.
- Goal: Write `assets/audit-ux.mjs` that imports from `./audit-lib.mjs`. Use `requireAuthState()`, `launchBrowser()`, `openPage()`, `navigate()`, `snap()`, `captureOverlay()`, and `domInventory()`. Do NOT reimplement auth, screenshots, or navigation. The script must:
  1. Call `requireAuthState()` at the top.
  2. Navigate to each target URL and interact ONLY with the components affected by `<changed_files>`.
  3. Capture interactive states (hover, focus, open, error) using `captureOverlay()`, saving to `screenshots/audit-ux-*.png`.
  4. Dump DOM state with `domInventory()` and `saveReport()` for analysis.
  5. Check keyboard navigation: Tab through the affected components and log focus order.
  Then run the script: `node assets/audit-ux.mjs`. Evaluate accessibility, focus management, feedback loops, engagement friction (Hook model), and Nielsen's heuristics strictly for the changed surfaces.
- Return: A markdown section titled **UX & Accessibility Findings** with heuristic scores (1–10), friction points, and accessibility violations scoped to the diff.

---

### Sub-Agent 3: Code & Architecture

**Prompt structure to pass:**
- Load skills: `vercel-react-best-practices`, `vercel-composition-patterns`.
- Inject: `<changed_files>`.
- Goal: Pure static analysis — no Playwright script needed. Read the `git diff` for the frontend files and review the specific React code changes against: re-render safety, missing memoization, context boundary correctness, client-side waterfalls, and prop-drilling. Evaluate component architectures of the modified files.
- Return: A markdown section titled **Code & Architecture Findings** scoped to the diff.

## Phase 3 — Compile Report 

Once all three `runSubagent` calls complete, synthesize their returns into the final report. Be specific: cite file paths, screenshot names, and specific rules.

### Executive Summary
2–4 sentences describing the overarching conclusion.

### Unified Findings
Group the sub-agents' findings into:
- 🎨 **Visual & Component Issues** (from Agent 1)
- 🧠 **UX & Accessibility Rubric** (from Agent 2)
- ⚛️ **Architecture & Rendering** (from Agent 3)

For each finding:
```
**[SEVERITY] Category — Short title**
File/Trigger: path/to/file.tsx:line or specific URL state
Screenshot: audit-*-<slug>.png (or code-only)
Issue: Exact description.
Fix: Actionable remediation step.
```

### Prioritized Remediation Plan
Group fixes by effort:
1. **Quick wins** (< 30 m)
2. **Medium effort** (30m - 2h)
3. **Larger refactors** (> 2h)
