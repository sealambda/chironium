export const meta = {
  name: "email-pending-cycle",
  description:
    "Build, test, browser-test and red-team docs/email-optional-and-pending-work.md end to end",
  whenToUse:
    'Implements the five phases of docs/email-optional-and-pending-work.md unattended, then browser-tests and red-teams them. Args: none for a full run; "from:<1-5>" to start at a later phase when earlier phases are already committed; "redteam" to skip building and run only the browser, red-team and closing steps.',
  phases: [
    { title: "Guard", detail: "branch, plan committed, services up, baseline test run", model: "sonnet" },
    { title: "Build", detail: "one plan phase at a time, in order; fixes from triage and red team", model: "opus" },
    { title: "Evidence", detail: "every rule the phase adds has a test that fails when the rule breaks", model: "sonnet" },
    { title: "Gate 1", detail: "compile, unit tests, lint, types, i18n; commit on green", model: "sonnet" },
    { title: "Gate 2", detail: "Playwright with email on and off, then a screenshot pass at desktop and phone width", model: "sonnet" },
    { title: "Triage", detail: "each browser failure: product code wrong, or test wrong", model: "opus" },
    { title: "Red team", detail: "round 1 sweeps four areas from the requirements alone; round 2 attacks the fixes", model: "opus" },
    { title: "Fix review", detail: "every red-team fix held and broke no caller", model: "opus" },
    { title: "Close", detail: "final gate, plan notes, summary", model: "sonnet" },
  ],
};

// ─── Arguments ───────────────────────────────────────────────────────

const words = String(args ?? "").trim().split(/\s+/).filter(Boolean);
const badWord = words.find((w) => !/^from:[1-5]$/.test(w) && w !== "redteam");
if (badWord) throw new Error(`cannot read "${badWord}": pass nothing, "from:<1-5>" or "redteam"`);
const redTeamOnly = words.includes("redteam");
const fromWord = words.find((w) => w.startsWith("from:"));
const startPhase = redTeamOnly ? 6 : fromWord ? Number(fromWord.slice(5)) : 1;

// ─── Shared context ──────────────────────────────────────────────────

const PLAN = "docs/email-optional-and-pending-work.md";
const BRANCH = "feat/email-optional-pending-work";
const BASE = "feat/patient-questionnaire-links";

const CHECKS =
  "Run, from the repository root: `mix compile --warnings-as-errors`, `mix test`, " +
  "`pnpm assets:check`, `pnpm assets:typecheck`, `pnpm assets:test` and " +
  "`pnpm --filter chironium-assets messages:sync:check`.";

const CODE_RULES =
  `Rules for code changes: read the code a step touches before editing it. Ash changes go ` +
  `through \`mix ash.codegen <short_name>\`, which writes the migrations and regenerates ` +
  `priv/schema.graphql; never hand-write a migration. After priv/schema.graphql changes, run ` +
  `\`pnpm assets:codegen\`. Never edit assets/src/routeTree.gen.ts, assets/src/graphql-env.d.ts or ` +
  `assets/src/paraglide/. New UI text goes in assets/messages/en.json and es.json (real Spanish), ` +
  `then \`pnpm --filter chironium-assets messages:sync\`. Format only the files you touch: \`mix ` +
  `format <files>\` and \`pnpm assets:check:fix\`; never \`mix format\` on the whole repo. Before ` +
  `changing a shared function, grep every caller and keep them all working. When the code ` +
  `contradicts ${PLAN}, follow the code, keep the change minimal, and record the difference under ` +
  `"## Implementation Notes" at the end of ${PLAN}, in the style of ` +
  `docs/patient-questionnaire-links.md. A choice only the product owner can make goes under ` +
  `"## Decisions Needed" in ${PLAN}; take the most conservative option meanwhile. Do not commit. `;

const RELEASE_BAR =
  `Tier every finding:\n` +
  `- P0: a person sees or changes data they should not (another organization, another care team, ` +
  `a patient session reaching staff data, a non-admin reading invite codes or links); a credential ` +
  `(questionnaire link token, invite code, accept URL) reaching logs, analytics, toasts, URLs after ` +
  `sign-in or the wrong person; an expired invitation or a Manager invitation for another email ` +
  `accepted; an email attempted while email is off; data saved or shown wrong (wrong patient, wrong ` +
  `day, wrong status); data lost; a crash or 500 on a main journey.\n` +
  `- P1: a Goal or Decision of ${PLAN} broken on a main journey; a reminder emailed more than once; ` +
  `a wrong Pending list or counter; untranslated Spanish text a user sees; a new screen unusable at ` +
  `375px width; a fix made in this run that broke something a user can see.\n` +
  `- P2: everything else (spacing, copy style, code tidiness, a P1-type issue that needs a ` +
  `contrived setup).\n` +
  `Unsure between two tiers: take the lower one.\n` +
  `Scope: a problem in code this work doesn't touch, and that this work didn't cause, is out of ` +
  `scope whatever its tier: record it as a follow-up and don't fix it.`;

// Everything found and not fixed lands here, so nothing a review finds is lost.
const TODO = "docs/TODO.md";
const FOLLOW_UPS =
  `${TODO} (append to the list): one entry per finding with its tier, what the user sees, ` +
  `repro and file:line`;

// The red team attacks from the requirements alone. Dev, reviewer and tester checking the same
// plan is one opinion wearing several hats.
const RED_TEAM_SOURCES =
  `You may read only the part of ${PLAN} above the "## Phase 1" heading (Goals, Decisions, ` +
  `Codebase Findings), plus product code and tests. You may not read the Phase sections, ` +
  `"Implementation Notes" of ${PLAN} or ${TODO}, and you may not run git log, git ` +
  `diff or git show. `;

const PROBE_RULES = (prefix) =>
  `Prove each finding with a throwaway probe test that fails on the current code: ExUnit at ` +
  `test/red_team/${prefix}_*_test.exs (use Chironium.DataCase or ChironiumWeb.ConnCase, ` +
  `Chironium.Generator and Chironium.QuestionnaireRequestFixtures), or Vitest at ` +
  `assets/src/red-team/${prefix}-*.test.ts(x). Where no test can show it, give the exact ` +
  `file:line and concrete steps with real values. Other agents run in parallel: do not edit ` +
  `product code, and do not run mix or pnpm; the merge step runs the probes. `;

const bullets = (list) =>
  list.map((f) => `- [${f.severity}] ${f.summary} (${f.location}). Repro: ${f.repro}` +
    (f.probe ? ` Probe: ${f.probe}.` : "")).join("\n");

// ─── Schemas ─────────────────────────────────────────────────────────

const GUARD = {
  type: "object",
  properties: {
    ready: { type: "boolean" },
    branch: { type: "string" },
    baselineFailures: {
      type: "array",
      items: { type: "string" },
      description: "tests already failing before this run, one per line",
    },
    problems: { type: "array", items: { type: "string" } },
  },
  required: ["ready", "branch", "baselineFailures", "problems"],
};

const GATE1 = {
  type: "object",
  properties: {
    green: { type: "boolean" },
    report: { type: "string", description: "final counts per command, verbatim" },
    commit: { type: "string", description: "commit hash, or empty when not committed" },
  },
  required: ["green", "report", "commit"],
};

const EVIDENCE = {
  type: "object",
  properties: {
    rules: {
      type: "array",
      items: {
        type: "object",
        properties: {
          rule: { type: "string" },
          test: { type: "string", description: "file and test name" },
          failsWhenBroken: { type: "boolean" },
        },
        required: ["rule", "test", "failsWhenBroken"],
      },
    },
  },
  required: ["rules"],
};

const FINDING = {
  type: "object",
  properties: {
    severity: { type: "string", enum: ["P0", "P1", "P2"] },
    summary: { type: "string" },
    repro: { type: "string", description: "concrete steps with real values" },
    location: { type: "string", description: "file:line" },
    probe: { type: "string", description: "probe test path, or empty" },
  },
  required: ["severity", "summary", "repro", "location"],
};

const SWEEP = {
  type: "object",
  properties: {
    findings: { type: "array", items: FINDING },
    checked: {
      type: "array",
      items: { type: "string" },
      description: "each required behavior confirmed to hold, with file:line",
    },
  },
  required: ["findings", "checked"],
};

const MERGED = {
  type: "object",
  properties: {
    confirmed: { type: "array", items: FINDING, description: "P0 and P1 findings to fix now" },
    followUps: { type: "number", description: "P2 findings and decisions recorded in the plan" },
    dropped: { type: "number", description: "findings whose probe passed or that duplicated another" },
  },
  required: ["confirmed", "followUps", "dropped"],
};

const E2E = {
  type: "object",
  properties: {
    blocked: { type: "string", description: "why the run could not start, or empty" },
    emailOn: { type: "string", description: "Playwright summary line, verbatim" },
    emailOff: { type: "string", description: "Playwright summary line, verbatim" },
    failures: {
      type: "array",
      items: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["email on", "email off"] },
          spec: { type: "string" },
          test: { type: "string" },
          error: { type: "string", description: "first error lines and the trace path" },
        },
        required: ["mode", "spec", "test", "error"],
      },
    },
  },
  required: ["blocked", "emailOn", "emailOff", "failures"],
};

const EXPLORE = {
  type: "object",
  properties: {
    blocked: { type: "string", description: "why the pass could not run, or empty" },
    cases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          width: { type: "number" },
          saw: { type: "string", description: "what the screenshot shows, concretely" },
          ok: { type: "boolean" },
        },
        required: ["id", "width", "saw", "ok"],
      },
    },
    findings: { type: "array", items: FINDING },
  },
  required: ["blocked", "cases", "findings"],
};

const TRIAGE = {
  type: "object",
  properties: {
    codeFindings: { type: "array", items: FINDING, description: "failures caused by product code" },
    testsFixed: { type: "array", items: { type: "string" }, description: "tests that were wrong, now fixed" },
    environment: { type: "array", items: { type: "string" }, description: "failures caused by the environment" },
  },
  required: ["codeFindings", "testsFixed", "environment"],
};

const REVIEW = {
  type: "object",
  properties: {
    held: { type: "boolean" },
    open: { type: "array", items: { type: "string" }, description: "fixes that did not hold, with why" },
  },
  required: ["held", "open"],
};

// ─── Steps ───────────────────────────────────────────────────────────

const report = { phases: [], gate2: [], explore: [], redTeam: [], stillFailing: [], stopped: "" };

async function gate1(label, message) {
  phase("Gate 1");
  return agent(
    `${CHECKS} Fix whatever fails and run the failing command again; stop after three attempts. ` +
      `Tests listed as failing before this run may stay failing: ${JSON.stringify(baseline)}. ` +
      `${CODE_RULES.replace("Do not commit. ", "")}` +
      `When every command passes, commit all changes with the message "${message}" plus the ` +
      `Co-Authored-By line from your instructions, and return its hash. Never push. When something ` +
      `still fails, commit nothing and return the failing output verbatim.`,
    { label: `gate1:${label}`, phase: "Gate 1", schema: GATE1, model: "sonnet" },
  );
}

async function build(label, task) {
  phase("Build");
  return agent(task + CODE_RULES, { label: `build:${label}`, phase: "Build", model: "opus" });
}

// Gate 1 that gets one Opus repair attempt before the run stops.
async function buildAndGate(label, message) {
  let g = await gate1(label, message);
  if (g?.green) return g;
  await build(
    `${label}-repair`,
    `Gate 1 failed after the build of ${label}. Fix the cause, not the symptom:\n${g?.report ?? "no report"}\n`,
  );
  g = await gate1(`${label}-retry`, message);
  if (!g?.green) report.stopped = `gate 1 stayed red at ${label}: ${String(g?.report).slice(0, 500)}`;
  return g;
}

async function triageAndFix(label, failures) {
  phase("Triage");
  const t = await agent(
    `These browser failures came from the Playwright run or the screenshot pass:\n` +
      `${JSON.stringify(failures)}\n` +
      `For each one, read the spec, its trace or screenshot, and the product code, and decide: ` +
      `product code wrong, test wrong (it asserts something ${PLAN} doesn't require, or uses a ` +
      `stale selector), or environment (port, database, browser install). Fix wrong tests yourself. ` +
      `Return product-code failures as findings with a tier.\n${RELEASE_BAR}\n` +
      `Write every P2 and every out-of-scope finding to ${FOLLOW_UPS}. ` +
      `Do not change product code. Do not commit.`,
    { label: `triage:${label}`, phase: "Triage", schema: TRIAGE, model: "opus", effort: "high" },
  );
  const code = (t?.codeFindings ?? []).filter((f) => f.severity !== "P2");
  if (code.length) {
    await build(
      `${label}-fixes`,
      `Fix these browser-test failures in product code, each at the rule rather than the one ` +
        `site named:\n${bullets(code)}\n`,
    );
  }
  if (code.length || t?.testsFixed?.length) await buildAndGate(`${label}-fixes`, "fix: address browser test failures");
  return { code: code.length, testsFixed: t?.testsFixed ?? [], environment: t?.environment ?? [] };
}

const PORT_RULE =
  `Port 4000 must be free before each Playwright run (\`lsof -ti tcp:4000\`). Playwright starts ` +
  `its own \`mix phx.server\` and stops it at the end. If port 4000 is held by a process this run ` +
  `did not start, do not kill it: return blocked with the process line. `;

async function gate2(label) {
  phase("Gate 2");
  const e = await agent(
    `Run the Playwright suite twice from the repository root. ${PORT_RULE}` +
      `1. Email on: \`RESEND_API_KEY=dev pnpm assets:e2e\`.\n` +
      `2. Email off: \`RESEND_API_KEY= pnpm assets:e2e\`. The empty value overrides envs/.env.\n` +
      `Return each run's summary line verbatim and every failing test with its first error lines ` +
      `and trace path. Fix nothing.`,
    { label: `e2e:${label}`, phase: "Gate 2", schema: E2E, model: "sonnet" },
  );
  report.gate2.push({ label, emailOn: e?.emailOn, emailOff: e?.emailOff, failures: e?.failures?.length ?? 0, blocked: e?.blocked });
  if (e?.blocked) {
    report.stopped = `gate 2 blocked: ${e.blocked}`;
    return null;
  }
  return e?.failures ?? [];
}

// Screenshots are expensive to keep in context, so a Sonnet agent reads them once and reports
// what it saw per case.
const EXPLORE_CASES = {
  "email on": [
    "Q1: send a questionnaire to a patient with an email address; the result shows the link, its expiry and the emailed note.",
    "I1: invite a Member; the result step shows the link, the code, the expiry and the emailed note.",
    "I2: invite a Manager; the result step also says only that address can accept it.",
    "I3: settings members table: a pending invitation offers Copy link, which shows the link; an invitation whose expires_at you set in the past (psql against chironium_dev) shows Expired and Renew, and Renew shows a new link.",
    "I4: a second user who is not the invited address opens a Manager invitation link and accepts: a translated error, no membership.",
    "R1: add a reminder dated today; the side menu shows Pending with count 1 (wide sidebar, collapsed sidebar at 768px, and the phone menu sheet); the Pending page lists it; Mark as done removes it and the count.",
    "O1: send a questionnaire with a due date, then move its requested_period end into the past (psql); the patient's activity feed shows Overdue, Pending lists it with how late it is, and Resend keeps it listed.",
    "O2: a questionnaire without a due date whose access_expires_at you moved into the past shows Link expired in the feed and on Pending, never Overdue.",
    "L1: switch the language to Spanish and repeat I1, R1 and O1: every new text is translated.",
  ],
  "email off": [
    "Q1: send a questionnaire to a patient with an email address; the result shows the link and no emailed note.",
    "I1: invite a Member; the result step shows the link and code and no emailed note.",
  ],
};

async function explore(mode) {
  phase("Gate 2");
  const key = mode === "email on" ? "dev" : "";
  const e = await agent(
    `Walk these cases in a real browser with the app's email ${mode === "email on" ? "on" : "off"}, ` +
      `at 1440px and at 375px width, and report what you saw per case:\n` +
      `${EXPLORE_CASES[mode].map((c) => `- ${c}`).join("\n")}\n` +
      `How: write a throwaway spec assets/e2e/zz-explore.spec.ts. Sign users in the way ` +
      `assets/e2e/questionnaire-links.spec.ts does (devPlaywrightEnsureUser and devPlaywrightSession ` +
      `from assets/e2e/playwright-session.ts). Save a full-page screenshot per case and width under ` +
      `tmp/explore/${mode === "email on" ? "on" : "off"}/. Run it with ` +
      `\`RESEND_API_KEY=${key} pnpm --filter chironium-assets exec playwright test e2e/zz-explore.spec.ts\` ` +
      `(after \`pnpm --filter chironium-assets e2e:install\`). ${PORT_RULE}` +
      `Open every screenshot and describe concretely what it shows: texts, counts, badges, layout ` +
      `problems such as clipped or overflowing content at 375px. A case you could not reach is not ` +
      `ok; say why. Report each deviation from the case as a finding with a tier.\n${RELEASE_BAR}\n` +
      `Delete assets/e2e/zz-explore.spec.ts when done. Do not change product code. Do not commit.`,
    { label: `explore:${mode}`, phase: "Gate 2", schema: EXPLORE, model: "sonnet" },
  );
  report.explore.push({ mode, blocked: e?.blocked, cases: e?.cases ?? [] });
  return e?.findings ?? [];
}

async function browserGate(label, { withExplore }) {
  const failures = await gate2(label);
  if (failures === null) return false;
  let found = failures;
  if (withExplore) {
    // P2s go through triage too, which records them as follow-ups instead of dropping them.
    found = [...found, ...(await explore("email on")), ...(await explore("email off"))];
  }
  if (!found.length) return true;
  const fixed = await triageAndFix(label, found);
  if (report.stopped) return false;
  // One rerun, never a loop: whatever still fails is reported and recorded at close.
  const rerun = await gate2(`${label}-rerun`);
  report.gate2.push({ label: `${label}-triage`, ...fixed });
  if (rerun?.length) report.stillFailing.push(...rerun.map((f) => `${f.mode}: ${f.spec} › ${f.test}: ${f.error}`));
  return rerun !== null;
}

// ─── Red team ────────────────────────────────────────────────────────

const AREAS = [
  {
    name: "email-switch",
    focus:
      "the email switch: every path that sends or prepares email (invitations, questionnaire links, " +
      "task reminders, Oban jobs already queued), runtime configuration with and without " +
      "RESEND_API_KEY, the emailed notes in the UI, and credentials leaking into logs, analytics, " +
      "job args or toasts",
    start: "lib/chironium/notifications.ex, lib/chironium/workers/notification_email_worker.ex, config/runtime.exs, lib/chironium/health/questionnaire_requests.ex",
  },
  {
    name: "invitations",
    focus:
      "invitation links: who can read invite codes and accept URLs (owner, manager, member, " +
      "practitioner, patient session, signed-out), expiry, Manager invitations bound to their " +
      "email, renew, revoke, re-invite, sign-in round trip with the code in the URL, the invite " +
      "dialog and the members table",
    start: "lib/chironium/accounts/invitation.ex, lib/chironium/accounts/organization.ex, assets/src/features/org/",
  },
  {
    name: "reminders",
    focus:
      "task reminders: one email per reminder date across many trigger runs, rescheduling, " +
      "editing other fields, completing in one step from every reminder status, the link in the " +
      "email, paper trail entries in the activity feed, and email off",
    start: "lib/chironium/health/task.ex, lib/chironium/health/changes/send_task_reminder.ex, assets/src/features/tasks/api/tasks-api.ts",
  },
  {
    name: "overdue-and-pending",
    focus:
      "overdue and pending: due dates picked in different timezones, the overdue and link-expired " +
      "rules, requests without a due date, resend and cancel, the Pending page and counter for " +
      "practitioners of other care teams, power users and patient sessions, the activity feed, " +
      "the patient portal's due date, and the page at phone width",
    start: "lib/chironium/health/task.ex, lib/chironium/health/task/changes/, assets/src/features/questionnaires/model/questionnaire-request-status.ts, assets/src/features/tasks/",
  },
];

async function mergeRound(round, sweeps) {
  phase("Red team");
  return agent(
    `Consolidate red-team round ${round}. ${RED_TEAM_SOURCES}The sweeps returned:\n` +
      `${JSON.stringify(sweeps.filter(Boolean))}\n` +
      `1. Run every probe: \`mix test test/red_team\` and ` +
      `\`pnpm --filter chironium-assets exec vitest run src/red-team\`. Drop a probe-backed finding ` +
      `whose probe passes. Keep a file:line finding only when you can follow its repro in the code. ` +
      `Merge duplicates across areas.\n` +
      `2. Re-tier each finding:\n${RELEASE_BAR}\n` +
      `3. Write every P2, every out-of-scope finding, and every finding that needs a product ` +
      `decision to ${FOLLOW_UPS}. Delete their probes.\n` +
      `4. Leave the probes of P0 and P1 findings in place; the fix step turns them into permanent ` +
      `tests. Return the P0 and P1 findings with their probe paths. Change no product code. Do not commit.`,
    { label: `redteam-merge:r${round}`, phase: "Red team", schema: MERGED, model: "opus", effort: "high" },
  );
}

async function fixRound(round, confirmed) {
  if (!confirmed.length) return null;
  await build(
    `redteam-r${round}`,
    `Fix these red-team findings, each at the rule rather than the one site named:\n` +
      `${bullets(confirmed)}\n` +
      `Each probe must pass after the fix. Then turn every probe into a permanent test in the test ` +
      `file that covers that code, named for the behavior, and delete test/red_team/ and ` +
      `assets/src/red-team/. `,
  );
  return buildAndGate(`redteam-r${round}`, `fix: address red team round ${round}`);
}

async function redTeam() {
  phase("Red team");
  // Round 1: one agent across all of it goes shallow, so it fans out per area.
  const sweeps = await parallel(
    AREAS.map((a, i) => () =>
      agent(
        `Red-team area "${a.name}" of the email-optional and pending work: ${a.focus}. Start ` +
          `from ${a.start}, then follow every caller and consumer. ${RED_TEAM_SOURCES}\n` +
          `Method: from the Goals and Decisions, list every behavior this area must have. For each ` +
          `one, check every entry point (GraphQL query or mutation, UI action, Oban job, email, ` +
          `portal), every actor (owner, manager, member, practitioner of the same and of another ` +
          `care team, patient portal session, signed-out visitor, a user with a different email), ` +
          `every state (email on and off, expired, revoked, cancelled, completed, no due date, ` +
          `timezones west and east of UTC) and every downstream consumer (activity feed, Pending ` +
          `page and counter, portal, emails, paper trail, Spanish text). ` +
          `${PROBE_RULES(`r1_area${i + 1}`)}\n${RELEASE_BAR}\n` +
          `Return findings and the behaviors you confirmed hold.`,
        { label: `redteam:r1:${a.name}`, phase: "Red team", schema: SWEEP, model: "opus", effort: "medium" },
      ),
    ),
  );
  const r1 = await mergeRound(1, sweeps);
  const fixed1 = r1?.confirmed ?? [];
  report.redTeam.push({ round: 1, fixed: fixed1.map((f) => `[${f.severity}] ${f.summary}`), followUps: r1?.followUps ?? 0, dropped: r1?.dropped ?? 0 });
  const g1 = await fixRound(1, fixed1);
  if (report.stopped) return [];

  // Round 2 attacks round 1's fixes and their callers. It may read the fix commit, nothing else
  // from history. A fresh sweep always finds something, so there is no round 3.
  if (!fixed1.length) return [];
  const sweep2 = await agent(
    `Red-team round 2: attack the fixes made for these round 1 findings, and every caller of ` +
      `what they changed:\n${bullets(fixed1)}\n` +
      `${RED_TEAM_SOURCES.replace("and you may not run git log, git diff or git show. ", "")}` +
      `You may read only the fix commit, with \`git show ${g1?.commit || "HEAD"}\`, and no other ` +
      `history. Look for a fix that holds only at the site named, a caller left broken, a test ` +
      `that asserts the symptom instead of the rule, and anything the fix made visibly worse. ` +
      `${PROBE_RULES("r2")}\n${RELEASE_BAR}\nReturn findings and what you confirmed holds.`,
    { label: "redteam:r2", phase: "Red team", schema: SWEEP, model: "opus", effort: "medium" },
  );
  const r2 = await mergeRound(2, [sweep2]);
  const fixed2 = r2?.confirmed ?? [];
  report.redTeam.push({ round: 2, fixed: fixed2.map((f) => `[${f.severity}] ${f.summary}`), followUps: r2?.followUps ?? 0, dropped: r2?.dropped ?? 0 });
  await fixRound(2, fixed2);
  return [...fixed1, ...fixed2];
}

// ─── Run ─────────────────────────────────────────────────────────────

phase("Guard");
const guard = await agent(
  `Prepare the repository for an unattended build. Do each step and report problems instead of ` +
    `working around them.\n` +
    `1. Branch: the work happens on ${BRANCH}, created from ${BASE}. If it exists, check it out; ` +
    `otherwise create it from ${BASE}. Never work on main. If the working tree has uncommitted ` +
    `changes other than ${PLAN} and .claude/workflows/, stop and report them.\n` +
    `2. If ${PLAN} is uncommitted, commit it alone as "docs: plan email-optional workflows and ` +
    `pending work" plus the Co-Authored-By line from your instructions.\n` +
    `3. PostgreSQL answers (\`pg_isready\`), \`mix deps.get\` and \`pnpm install\` succeed.\n` +
    `4. Baseline: run \`mix test\` and \`pnpm assets:test\`, and list every test that already ` +
    `fails, so later gates don't blame this run for it.\n` +
    `Return ready only when steps 1 to 3 succeeded.`,
  { label: "guard", phase: "Guard", schema: GUARD, model: "sonnet", effort: "low" },
);
const baseline = guard?.baselineFailures ?? [];
if (!guard?.ready) return { stopped: "guard failed", problems: guard?.problems ?? ["guard returned nothing"] };

const COMMITS = {
  1: "feat(notifications): make email optional",
  2: "fix(tasks): send each task reminder once",
  3: "feat(invitations): share, expire and renew invitation links",
  4: "feat(questionnaires): local due dates and overdue status",
  5: "feat(tasks): add the pending page",
};

for (const n of [1, 2, 3, 4, 5]) {
  if (n < startPhase) continue;
  log(`Phase ${n} of 5`);
  await build(
    `phase${n}`,
    `Implement Phase ${n} of ${PLAN}, and only that phase. Read the whole plan first: Decisions ` +
      `and Codebase Findings apply to every phase, and earlier phases' Implementation Notes say ` +
      `where the build already differs from the plan. Write every test the phase lists, Playwright ` +
      `specs included (assets/e2e/, signing users in like questionnaire-links.spec.ts). For a bug ` +
      `fix, write the regression test first and see it fail. Run the ExUnit and Vitest files you ` +
      `touch; do not run Playwright (gate 2 runs it once all phases are built). `,
  );
  phase("Evidence");
  const ev = await agent(
    `Check the tests of Phase ${n} of ${PLAN} against the code just built (uncommitted). For ` +
      `every rule in that phase's Tests list: find the test that covers it, or write it. Break ` +
      `the rule in the product code with the smallest edit, run that test file, see it fail, then ` +
      `restore the product file exactly (\`git diff\` on it must match what it was before). A rule ` +
      `whose test still passes when broken gets a better test. Do not commit.`,
    { label: `evidence:phase${n}`, phase: "Evidence", schema: EVIDENCE, model: "sonnet", effort: "medium" },
  );
  const g = await buildAndGate(`phase${n}`, COMMITS[n]);
  report.phases.push({
    phase: n,
    commit: g?.commit ?? "",
    gate1: String(g?.report ?? "").slice(0, 300),
    weakTests: (ev?.rules ?? []).filter((r) => !r.failsWhenBroken).map((r) => r.rule),
  });
  if (report.stopped) return report;
}

// Browser tests run once all code is in, then again only if the red team changed code.
if (!(await browserGate("after-build", { withExplore: true }))) return report;

const redTeamFixes = await redTeam();
if (report.stopped) return report;

if (redTeamFixes.length) {
  phase("Fix review");
  const review = await agent(
    `Review the red-team fixes of this run; look for nothing new. They are the commits whose ` +
      `message starts with "fix: address red team round" (\`git log --grep\`, then \`git show\`). ` +
      `The findings were:\n${bullets(redTeamFixes)}\n` +
      `For each fix: its test exists and passes; the change stays inside what the finding names, ` +
      `plus the callers a shared fix had to cover; grep every caller of each function the fix ` +
      `changed and confirm none is broken. Confirm test/red_team/ and assets/src/red-team/ are ` +
      `gone. Return held, or each fix that did not hold with why. Change nothing.`,
    { label: "fix-review", phase: "Fix review", schema: REVIEW, model: "opus", effort: "high" },
  );
  if (!review?.held) {
    await build("fix-review", `These red-team fixes did not hold. Fix each properly:\n${(review?.open ?? []).join("\n")}\n`);
    await buildAndGate("fix-review", "fix: complete the red team fixes");
    if (report.stopped) return report;
  }
  // A repaired fix passes gate 1 and the browser rerun, but is not reviewed a second time.
  report.fixReview = review?.held ? "held" : { repairedNotReReviewed: review?.open ?? [] };
  if (!(await browserGate("after-red-team", { withExplore: false }))) return report;
}

phase("Close");
const close = await agent(
  `Close the run. 1. ${CHECKS} Fix nothing; report the counts. 2. In ${PLAN}, make sure ` +
    `"## Implementation Notes" lists every difference from the plan that \`git log ${BASE}..HEAD\` ` +
    `shows, and that "## Decisions Needed" exists when anything was ` +
    `recorded. Add each of these browser tests, still failing after their one rerun, to ` +
    `${FOLLOW_UPS}: ${JSON.stringify(report.stillFailing)}. 3. If ${PLAN} or ${TODO} changed, commit them alone as "docs: record implementation notes" plus ` +
    `the Co-Authored-By line. Never push. 4. Return \`git log --oneline ${BASE}..HEAD\` and the ` +
    `check counts, verbatim.`,
  { label: "close", phase: "Close", model: "sonnet", effort: "low" },
);

// Facts, not a verdict: the launching session summarises them for the user.
return { branch: BRANCH, ...report, close };
