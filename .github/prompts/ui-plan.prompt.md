---
name: ui-plan
description: Takes a feature description or refactor request, reads the current codebase and live UI, then dispatches parallel sub-agents to assess the current state and produce a concrete implementation plan.
agent: agent
argument-hint: "[dev-server-url] — defaults to http://localhost:4000"
---

# UI Planning Orchestrator

You are a senior product design architect orchestrating a swarm of analysis agents whose sole output is an actionable implementation plan. Work through the phases below in order. Do not skip phases. You will delegate the deep work to parallel sub-agents using the `runSubagent` tool.

## Phase 0 — Auth Check

Before doing anything else, verify that the audit auth state is present:

```bash
ls assets/e2e/.auth/audit-sso.json 2>/dev/null && echo "AUTH OK" || echo "AUTH MISSING"
```

If the output is **AUTH MISSING**, stop and instruct the user:

> Please run `pnpm --dir assets audit:auth` in your terminal. A Chromium browser will open — complete Google SSO. The script will save your session automatically. Come back here once it prints "✓ Session saved".

Wait for the user to confirm before continuing.

## Phase 1 — Capture Intent & Discover Scope

The dev server URL is: **${input:devServerUrl:http://localhost:4000}**

Ask the user to describe what they want to build or change if they have not already done so:
> Please describe the feature, refactor, or change you want to implement. Be as specific or vague as you like — include goals, constraints, and any relevant context.

Once you have the description, record it as `<intent>` and proceed.

1. Read `assets/src/routeTree.gen.ts` to map all registered routes.
2. Identify which routes and components are most relevant to the described intent.
3. Determine the target URLs to visit (e.g., `http://localhost:4000/customers/123`).
4. List the source files that are most likely to be involved in the implementation (features, shared components, API files, i18n keys, Ash resources).

## Phase 2 — Dispatch the Swarm (Parallel Sub-Agents)

Invoke the `runSubagent` tool to spawn the following three sub-agents **IN PARALLEL**.

Inject into every sub-agent's prompt:
- `<intent>` — the user's verbatim description of what they want.
- `<relevant_files>` — the list of files you identified in Phase 1.
- `<target_urls>` — the live URLs to visit.
- `<base_url>` — the dev server base URL.

CRITICAL SCOPE RULE: Every sub-agent must anchor ALL findings and recommendations strictly to the described intent. They must not propose changes to code or UI surfaces that are unrelated to the intent. They will fail the assignment if they recommend gratuitous refactors outside the stated scope.

---

### Sub-Agent 1: Visual Design & Component Assessment

**Prompt structure to pass:**
- Load skills: `playwright-cli`, `claude-frontend-design`, `ui-ux-pro-max`, `shadcn`, `shadcn-ui`.
- Context: `<intent>`, `<relevant_files>`, `<target_urls>`, `<base_url>`.
- Goal: Write `assets/audit-visual.mjs` that imports from `./audit-lib.mjs`. Use `requireAuthState()`, `launchBrowser()`, `openPage()`, `navigate()`, `snap()`, `snapViewports()`, `captureOverlay()`, `discoverCustomerIds()`, and `domInventory()`. Do NOT reimplement auth, screenshots, or navigation — the lib handles all of that. The script must:
  1. Call `requireAuthState()` at the top.
  2. Use `discoverCustomerIds()` when customer IDs are needed — never hardcode UUIDs.
  3. Navigate to each target URL and take focused screenshots of the surfaces relevant to the intent (saved to `screenshots/plan-visual-*.png`).
  4. Extract DOM structure with `domInventory()` and `saveReport()` for the relevant components.
  5. Capture open states of interactive components in scope using `captureOverlay()`.
  Then run: `node assets/audit-visual.mjs`. Analyze the screenshots and DOM reports. Assess the current visual state against the design system (Tailwind tokens, shadcn component usage, typography, spacing, contrast). Identify gaps between the current UI and what the intent requires. Propose specific component choices, layout structures, and design decisions.
- Return: A markdown section titled **Visual & Component Plan** with current-state observations and specific design recommendations for implementing the intent.

---

### Sub-Agent 2: UX & Interaction Assessment

**Prompt structure to pass:**
- Load skills: `playwright-cli`, `ux-heuristics`, `hooked-ux`, `web-design-guidelines`.
- Context: `<intent>`, `<relevant_files>`, `<target_urls>`, `<base_url>`.
- Goal: Write `assets/audit-ux.mjs` that imports from `./audit-lib.mjs`. Use `requireAuthState()`, `launchBrowser()`, `openPage()`, `navigate()`, `snap()`, `captureOverlay()`, and `domInventory()`. Do NOT reimplement auth, screenshots, or navigation. The script must:
  1. Call `requireAuthState()` at the top.
  2. Navigate to each target URL and interact with the relevant components to observe current UX flows.
  3. Capture interactive states (hover, focus, open, error) with `captureOverlay()`, saving to `screenshots/plan-ux-*.png`.
  4. Dump DOM state with `domInventory()` and `saveReport()`.
  Then run: `node assets/audit-ux.mjs`. Evaluate current interaction flows and information architecture. Map the user journey required to satisfy the intent. Score the current state against Nielsen's heuristics (1–10). Flag accessibility concerns and engagement friction points.
- Return: A markdown section titled **UX & Interaction Plan** with current-state heuristic scores, journey maps, and interaction recommendations.

---

### Sub-Agent 3: Code & Architecture Assessment

**Prompt structure to pass:**
- Load skills: `vercel-react-best-practices`, `vercel-composition-patterns`.
- Context: `<intent>`, `<relevant_files>`.
- Goal: Pure static analysis — no Playwright script needed. Read the source files listed in `<relevant_files>`. Summarize the current architecture, identify structural issues that would complicate the intent, and propose a concrete implementation blueprint: which files to create or modify, how data flows, where state lives, what API calls or GraphQL operations are needed, and how to integrate with existing shared utilities. Flag re-rendering risks, missing memoization, prop-drilling, and waterfall concerns.
- Return: A markdown section titled **Code & Architecture Plan** with current-state analysis and a structured implementation blueprint.

#### 5. i18n
New message keys to add and their English values.

### Prioritized Execution Order
Order the steps by dependency and effort:
1. **Prerequisites** — must be done first (schema, API, types)
2. **Core implementation** — primary feature work
3. **Polish & accessibility** — loading states, error handling, a11y
4. **Validation** — what to check once implemented (manual steps or tests)
