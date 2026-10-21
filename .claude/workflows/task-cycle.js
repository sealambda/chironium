export const meta = {
  name: "task-cycle",
  description: "Plan, build, test, browser-test and red-team one task end to end",
  whenToUse:
    'Takes any task, writes or reuses its plan under docs/, then builds it phase by phase, browser-tests it and red-teams it unattended. Args: the task in words (or the docs/TODO.md entry it comes from), or the path of an existing plan ("docs/<name>.md"). Add "from:<n>" to start at build phase n when earlier phases are already committed, or "redteam" to skip building and run only the browser, red-team and closing steps; both need a plan path. The run stops before building when the plan has open product decisions: answer them in the plan and rerun with its path. When summarising the result, lead with "stopped", "decisionsNeeded" and "preexistingP0".',
  phases: [
    { title: "Guard", detail: "clean tree, services up, migrations applied, baseline test run", model: "sonnet" },
    { title: "Plan", detail: "write docs/<name>.md from the task and the code", model: "opus" },
    { title: "Plan check", detail: "plan vs task, by an agent that did not write it; open decisions stop the run", model: "opus" },
    { title: "Setup", detail: "read the plan's shape, branch, commit the plan", model: "sonnet" },
    { title: "Build", detail: "one plan phase at a time, in order; fixes from triage and red team", model: "opus" },
    { title: "Evidence", detail: "every rule the phase adds has a test that fails when the rule breaks", model: "sonnet" },
    { title: "Gate 1", detail: "compile, unit tests, lint, types, i18n; commit on green", model: "sonnet" },
    { title: "Gate 2", detail: "Playwright, then a screenshot pass at desktop and phone width", model: "sonnet" },
    { title: "Triage", detail: "each browser failure: product code wrong, or test wrong", model: "opus" },
    { title: "Red team", detail: "round 1 sweeps the plan's areas from the requirements alone; round 2 attacks the fixes", model: "opus" },
    { title: "Fix review", detail: "every red-team fix held and broke no caller", model: "opus" },
    { title: "Close", detail: "final gate, plan notes, follow-ups, verified", model: "sonnet" },
  ],
};

// ─── Arguments ───────────────────────────────────────────────────────

const words = String(args ?? "").trim().split(/\s+/).filter(Boolean);
const redTeamOnly = words.includes("redteam");
const fromWord = words.find((w) => /^from:\d+$/.test(w));
const taskText = words.filter((w) => w !== "redteam" && w !== fromWord).join(" ");
if (!taskText) throw new Error('pass the task in words, or a plan path such as "docs/<name>.md"');
const givenPlan = /^docs\/[\w.-]+\.md$/.test(taskText) ? taskText : "";
if ((redTeamOnly || fromWord) && !givenPlan) {
  throw new Error('"from:<n>" and "redteam" go with a plan path, e.g. "docs/<name>.md redteam"');
}

// ─── Shared context ──────────────────────────────────────────────────

const TODO = "docs/TODO.md";
const PLAN_MODELS = "docs/email-optional-and-pending-work.md and docs/patient-questionnaire-links.md";
const CO_AUTHOR = "plus the Co-Authored-By line from your instructions";

// Set once the plan is read; every prompt below runs after that.
let PLAN = givenPlan;
let TITLE = "";

const CHECKS =
  "Run `.claude/workflows/checks.sh` from the repository root, with timeout: 600000 on the Bash " +
  "call, never in the background. It runs compile, `mix test`, lint, types, frontend tests and the " +
  "translation check one after another and prints one line per check; full logs are in tmp/checks/. " +
  "A FLAKY line passes the gate; report the test names it lists.";

// Committing by path keeps throwaway files (explore specs, probes, screenshots) out of history.
const COMMIT_RULE =
  "Stage files by path (`git add <paths>`) for the changes this work made; never `git add -A` " +
  "or `git add .`. Leave throwaway files (assets/e2e/zz-explore*.spec.ts, test/red_team/, " +
  "assets/src/red-team/, screenshots) unstaged and name any you find. Never push. ";

const codeRules = () =>
  `Rules for code changes: read the code a step touches before editing it. Ash changes go ` +
  `through \`mix ash.codegen <short_name>\`, which writes the migrations and regenerates ` +
  `priv/schema.graphql; never hand-write a migration. After priv/schema.graphql changes, run ` +
  `\`pnpm assets:codegen\`. Never edit assets/src/routeTree.gen.ts, assets/src/graphql-env.d.ts or ` +
  `assets/src/paraglide/. New UI text goes in assets/messages/en.json and es.json (real Spanish), ` +
  `then \`pnpm --filter chironium-assets messages:sync\`. Format only the files you touch: \`mix ` +
  `format <files>\` and \`pnpm assets:check:fix\`; never \`mix format\` on the whole repo. Before ` +
  `changing a shared function, grep every caller and keep them all working. When the code ` +
  `contradicts ${PLAN}, follow the code, keep the change minimal, and record the difference under ` +
  `"## Implementation Notes" at the end of ${PLAN}. A choice only the product owner can make goes ` +
  `under "## Decisions Needed" in ${PLAN}; take the most conservative option meanwhile. Do not commit. `;

// A P0 is never left for later: the email-optional run logged a cross-organization hole as
// "out of scope" because it predated the work, and it shipped unfixed.
const releaseBar = () =>
  `Tier every finding:\n` +
  `- P0: a person sees or changes data they should not (another organization, another care team, ` +
  `a patient session reaching staff data, a role doing what only a higher role may); a credential ` +
  `(token, invite code, link, key) reaching logs, analytics, toasts, URLs or the wrong person; ` +
  `data saved or shown wrong (wrong patient, wrong day, wrong status); data lost; a crash or 500 ` +
  `on a main journey.\n` +
  `- P1: a Goal or Decision of ${PLAN} broken on a main journey; untranslated Spanish text a user ` +
  `sees; a new screen unusable at 375px width; a fix made in this run that broke something a ` +
  `user can see.\n` +
  `- P2: everything else (spacing, copy style, code tidiness, a P1-type issue that needs a ` +
  `contrived setup).\n` +
  `Unsure between two tiers: take the lower one.\n` +
  `Scope: a P1 or P2 in code this work doesn't touch, and that this work didn't cause, is out of ` +
  `scope: record it as a follow-up and don't fix it. A P0 is never out of scope: it is fixed in ` +
  `this run wherever it lives; mark it preexisting when this work didn't cause it.`;

const followUps = () =>
  `${TODO}, under the heading "## ${TITLE}" (create it after the last entry if missing, with a ` +
  `one-line link to ${PLAN}): one entry per finding with its tier, what the user sees, repro and ` +
  `file:line. Nowhere else: not in ${PLAN}`;

// The red team attacks from the requirements alone. Dev, reviewer and tester checking the same
// plan is one opinion wearing several hats.
const redTeamSources = () =>
  `You may read only the part of ${PLAN} above its first "## Phase" heading (Goals, Decisions, ` +
  `Codebase Findings), plus product code and tests. You may not read the Phase sections, ` +
  `"Implementation Notes" of ${PLAN} or ${TODO}, and you may not run git log, git ` +
  `diff or git show. `;

const PROBE_RULES = (prefix) =>
  `Prove each finding with a throwaway probe test that fails on the current code: ExUnit at ` +
  `test/red_team/${prefix}_*_test.exs (use Chironium.DataCase or ChironiumWeb.ConnCase and the ` +
  `generators and fixtures under test/support/), or Vitest at ` +
  `assets/src/red-team/${prefix}-*.test.ts(x). Where no test can show it, give the exact ` +
  `file:line and concrete steps with real values. Other agents run in parallel: do not edit ` +
  `product code, and do not run mix or pnpm; the merge step runs the probes. `;

const bullets = (list) =>
  list.map((f) => `- [${f.severity}${f.preexisting ? ", preexisting" : ""}] ${f.summary} (${f.location}). Repro: ${f.repro}` +
    (f.probe ? ` Probe: ${f.probe}.` : "")).join("\n");

// ─── Schemas ─────────────────────────────────────────────────────────

const GUARD = {
  type: "object",
  properties: {
    ready: { type: "boolean" },
    branch: { type: "string", description: "branch checked out when the run started" },
    baselineFailures: {
      type: "array",
      items: { type: "string" },
      description: "tests already failing before this run, one per line",
    },
    problems: { type: "array", items: { type: "string" } },
  },
  required: ["ready", "branch", "baselineFailures", "problems"],
};

const PLAN_CHECK = {
  type: "object",
  properties: {
    gaps: {
      type: "array",
      items: { type: "string" },
      description: "each part of the task the plan misses or gets wrong, with why",
    },
  },
  required: ["gaps"],
};

const SHAPE = {
  type: "object",
  properties: {
    plan: { type: "string", description: "plan path" },
    title: { type: "string", description: "the plan's # title" },
    branch: { type: "string" },
    base: { type: "string", description: "branch the work branch was created from" },
    phases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          n: { type: "number" },
          title: { type: "string" },
          commit: { type: "string", description: "conventional commit message for the phase" },
        },
        required: ["n", "title", "commit"],
      },
    },
    emailBoth: { type: "boolean", description: "the plan's Browser Cases say to test with email on and off" },
    cases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          mode: { type: "string", enum: ["email on", "email off"] },
          text: { type: "string", description: "the case verbatim" },
        },
        required: ["id", "mode", "text"],
      },
    },
    areas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          focus: { type: "string" },
          start: { type: "string", description: "files to start from, comma-separated" },
        },
        required: ["name", "focus", "start"],
      },
    },
    decisionsNeeded: {
      type: "array",
      items: { type: "string" },
      description: 'each entry still under "## Decisions Needed", verbatim',
    },
  },
  required: ["plan", "title", "branch", "base", "phases", "emailBoth", "cases", "areas", "decisionsNeeded"],
};

const GATE1 = {
  type: "object",
  properties: {
    green: { type: "boolean" },
    report: { type: "string", description: "the checks.sh summary lines, verbatim" },
    flaky: { type: "array", items: { type: "string" }, description: "test names from FLAKY lines" },
    commit: { type: "string", description: "commit hash, or empty when not committed" },
  },
  required: ["green", "report", "flaky", "commit"],
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
    preexisting: { type: "boolean", description: "true when this work didn't cause it" },
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
    followUps: { type: "number", description: "findings recorded as follow-ups" },
    dropped: { type: "number", description: "findings whose probe passed or that duplicated another" },
  },
  required: ["confirmed", "followUps", "dropped"],
};

const E2E = {
  type: "object",
  properties: {
    blocked: { type: "string", description: "why a run could not start, or empty" },
    runs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["email on", "email off"] },
          summary: { type: "string", description: "Playwright summary line, verbatim" },
        },
        required: ["mode", "summary"],
      },
    },
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
  required: ["blocked", "runs", "failures"],
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

const CLOSE = {
  type: "object",
  properties: {
    checks: { type: "string", description: "the checks.sh summary lines, verbatim" },
    planHeadings: { type: "string", description: "output of grep -n '^## ' on the plan, verbatim" },
    todoHeadings: { type: "string", description: `output of grep -n '^## ' ${TODO}, verbatim` },
    log: { type: "string", description: "git log --oneline <base>..HEAD, verbatim" },
    status: { type: "string", description: "git status --short, verbatim" },
  },
  required: ["checks", "planHeadings", "todoHeadings", "log", "status"],
};

// ─── Steps ───────────────────────────────────────────────────────────

const report = {
  stopped: "",
  decisionsNeeded: [],
  preexistingP0: [],
  phases: [],
  gate2: [],
  explore: [],
  unchecked: [],
  redTeam: [],
  stillFailing: [],
  flaky: [],
};
let baseline = [];
let followUpCount = 0;

async function gate1(label, message) {
  phase("Gate 1");
  const g = await agent(
    `${CHECKS} Fix whatever fails and run the script again; stop after three attempts. ` +
      `Tests listed as failing before this run may stay failing: ${JSON.stringify(baseline)}. ` +
      `${codeRules().replace("Do not commit. ", "")}` +
      `When every check passes, commit with the message "${message}" ${CO_AUTHOR}, and return ` +
      `its hash. ${COMMIT_RULE}When something still fails, commit nothing and return the failing ` +
      `output verbatim.`,
    { label: `gate1:${label}`, phase: "Gate 1", schema: GATE1, model: "sonnet" },
  );
  report.flaky.push(...(g?.flaky ?? []));
  return g;
}

async function build(label, task) {
  phase("Build");
  return agent(task + codeRules(), { label: `build:${label}`, phase: "Build", model: "opus" });
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
      `Return product-code failures as findings with a tier.\n${releaseBar()}\n` +
      `Write every P2 and every out-of-scope finding to ${followUps()}. ` +
      `Do not change product code. Do not commit.`,
    { label: `triage:${label}`, phase: "Triage", schema: TRIAGE, model: "opus", effort: "high" },
  );
  const code = (t?.codeFindings ?? []).filter((f) => f.severity !== "P2");
  followUpCount += (t?.codeFindings ?? []).length - code.length;
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

const MODES = { "email on": "dev", "email off": "" };

// Builds add migrations, and an unmigrated dev database blocked the first email-optional run.
const SERVER_RULE =
  `Run \`mix ecto.migrate\` before the first Playwright run; if a run fails with ` +
  `PendingMigrationError, run it again and restart that run once. Port 4000 must be free before ` +
  `each run (\`lsof -ti tcp:4000\`). Playwright starts its own \`mix phx.server\` and stops it at ` +
  `the end. If port 4000 is held by a process this run did not start, do not kill it: return ` +
  `blocked with the process line. `;

async function gate2(label, modes) {
  phase("Gate 2");
  const e = await agent(
    `Run the Playwright suite from the repository root, once per mode. ${SERVER_RULE}\n` +
      modes.map((m, i) => `${i + 1}. ${m}: \`RESEND_API_KEY=${MODES[m]} pnpm assets:e2e\`.`).join("\n") +
      `\nAn empty RESEND_API_KEY overrides envs/.env. Return each run's summary line verbatim and ` +
      `every failing test with its first error lines and trace path. Fix nothing.`,
    { label: `e2e:${label}`, phase: "Gate 2", schema: E2E, model: "sonnet" },
  );
  report.gate2.push({ label, runs: e?.runs ?? [], failures: e?.failures?.length ?? 0, blocked: e?.blocked });
  if (e?.blocked || !e) {
    // A resume would replay this cached blocked result, so the way on is a fresh run.
    report.stopped =
      `gate 2 blocked: ${e?.blocked ?? "no result"}. Fix the cause, then start a fresh run with ` +
      `args "${PLAN} redteam"; a resume replays the blocked result.`;
    return null;
  }
  return e.failures ?? [];
}

const WIDTHS = [1440, 375];
const CHUNK = 3;

// Screenshots are expensive to keep in context, so small Sonnet agents read them once and report
// what they saw per case. Small batches keep each agent inside its time; the email-optional run
// lost every email-on case to one agent that ran out of time.
async function exploreBatch(mode, cases, label) {
  phase("Gate 2");
  const dir = mode === "email on" ? "on" : "off";
  const spec = `assets/e2e/zz-explore-${label}.spec.ts`;
  const e = await agent(
    `Walk these cases in a real browser with the app's email ${dir}, at ${WIDTHS.join("px and ")}px ` +
      `width, and report what you saw per case and width:\n` +
      `${cases.map((c) => `- ${c.id}: ${c.text}`).join("\n")}\n` +
      `How: write a throwaway spec ${spec}. Sign users in the way assets/e2e/questionnaire-links.spec.ts ` +
      `does (devPlaywrightEnsureUser and devPlaywrightSession from assets/e2e/playwright-session.ts). ` +
      `Save a full-page screenshot per case and width under tmp/explore/${dir}/. Run it with ` +
      `\`RESEND_API_KEY=${MODES[mode]} pnpm --filter chironium-assets exec playwright test ${spec.replace("assets/", "")}\` ` +
      `(after \`pnpm --filter chironium-assets e2e:install\`). ${SERVER_RULE}` +
      `Open every screenshot and describe concretely what it shows: texts, counts, badges, layout ` +
      `problems such as clipped or overflowing content at 375px. A case you could not reach is not ` +
      `ok; say why. Report each deviation from the case as a finding with a tier.\n${releaseBar()}\n` +
      `Delete ${spec} when done. Do not change product code. Do not commit.`,
    { label: `explore:${label}`, phase: "Gate 2", schema: EXPLORE, model: "sonnet" },
  );
  return e;
}

// Agents run one at a time: they share port 4000 and the dev database.
async function explore(mode, cases) {
  const found = [];
  const seen = new Set();
  const key = (id, width) => `${id}@${width}`;
  const take = (e) => {
    for (const c of e?.cases ?? []) seen.add(key(c.id, c.width));
    report.explore.push({ mode, blocked: e?.blocked ?? "no result", cases: e?.cases ?? [] });
    found.push(...(e?.findings ?? []));
  };
  for (let i = 0; i < cases.length; i += CHUNK) {
    take(await exploreBatch(mode, cases.slice(i, i + CHUNK), `${mode.replace(" ", "-")}-${i / CHUNK + 1}`));
  }
  const missing = () => cases.filter((c) => WIDTHS.some((w) => !seen.has(key(c.id, w))));
  if (missing().length) take(await exploreBatch(mode, missing(), `${mode.replace(" ", "-")}-retry`));
  const left = missing();
  if (left.length) {
    report.unchecked.push(...left.map((c) => `${mode}: ${c.id}`));
    log(`screenshot pass: ${left.length} ${mode} case(s) never checked`);
  }
  return found;
}

async function browserGate(label, shape, { withExplore }) {
  const modes = shape.emailBoth ? ["email on", "email off"] : ["email on"];
  const failures = await gate2(label, modes);
  if (failures === null) return false;
  let found = failures;
  if (withExplore) {
    // P2s go through triage too, which records them as follow-ups instead of dropping them.
    for (const mode of modes) {
      const cases = shape.cases.filter((c) => c.mode === mode);
      if (cases.length) found = [...found, ...(await explore(mode, cases))];
    }
  }
  if (!found.length) return true;
  const fixed = await triageAndFix(label, found);
  if (report.stopped) return false;
  // One rerun, never a loop: whatever still fails is reported and recorded at close.
  const rerun = await gate2(`${label}-rerun`, modes);
  report.gate2.push({ label: `${label}-triage`, ...fixed });
  if (rerun?.length) report.stillFailing.push(...rerun.map((f) => `${f.mode}: ${f.spec} › ${f.test}: ${f.error}`));
  return rerun !== null;
}

// ─── Red team ────────────────────────────────────────────────────────

async function mergeRound(round, sweeps) {
  phase("Red team");
  return agent(
    `Consolidate red-team round ${round}. ${redTeamSources()}The sweeps returned:\n` +
      `${JSON.stringify(sweeps.filter(Boolean))}\n` +
      `1. Run every probe: \`mix test test/red_team\` and ` +
      `\`pnpm --filter chironium-assets exec vitest run src/red-team\`. Drop a probe-backed finding ` +
      `whose probe passes. Keep a file:line finding only when you can follow its repro in the code. ` +
      `Merge duplicates across areas.\n` +
      `2. Re-tier each finding, and mark it preexisting when this work didn't cause it:\n${releaseBar()}\n` +
      `3. Write every P2, every out-of-scope P1, and every finding that needs a product decision to ` +
      `${followUps()}. Delete their probes.\n` +
      `4. Leave the probes of every P0 and in-scope P1 in place; the fix step turns them into ` +
      `permanent tests. Return those findings with their probe paths. Change no product code. Do not commit.`,
    { label: `redteam-merge:r${round}`, phase: "Red team", schema: MERGED, model: "opus", effort: "high" },
  );
}

const PROBES_TO_TESTS =
  `Each probe must pass after the fix. Then turn every probe into a permanent test in the test ` +
  `file that covers that code, named for the behavior. `;

// A preexisting P0 gets its own commit, so it can be cherry-picked onto the base branch too.
async function fixRound(round, confirmed) {
  const old = confirmed.filter((f) => f.severity === "P0" && f.preexisting);
  const rest = confirmed.filter((f) => !old.includes(f));
  let g = null;
  if (old.length) {
    await build(
      `redteam-r${round}-preexisting`,
      `Fix these P0 findings that predate this work, each at the rule rather than the one site ` +
        `named, touching nothing else:\n${bullets(old)}\n${PROBES_TO_TESTS}Delete only their probes. `,
    );
    g = await buildAndGate(`redteam-r${round}-preexisting`, `fix: close preexisting P0 found by red team round ${round}`);
    report.preexistingP0.push({ commit: g?.commit ?? "", findings: old.map((f) => f.summary) });
    if (report.stopped) return g;
  }
  if (rest.length) {
    await build(
      `redteam-r${round}`,
      `Fix these red-team findings, each at the rule rather than the one site named:\n` +
        `${bullets(rest)}\n${PROBES_TO_TESTS}`,
    );
    g = await buildAndGate(`redteam-r${round}`, `fix: address red team round ${round}`);
  }
  return g;
}

async function redTeam(shape) {
  phase("Red team");
  const areas = shape.areas.length
    ? shape.areas
    : [{ name: "whole-task", focus: `everything ${PLAN} changes`, start: "the files its phases name" }];
  // Round 1: one agent across all of it goes shallow, so it fans out per area.
  const sweeps = await parallel(
    areas.map((a, i) => () =>
      agent(
        `Red-team area "${a.name}" of ${TITLE}: ${a.focus}. Start from ${a.start}, then follow ` +
          `every caller and consumer. ${redTeamSources()}\n` +
          `Method: from the Goals and Decisions, list every behavior this area must have. For each ` +
          `one, check every entry point (GraphQL query or mutation, UI action, Oban job, email, ` +
          `portal), every actor (owner, manager, member, practitioner of the same and of another ` +
          `care team, patient portal session, signed-out visitor, a user who also owns another ` +
          `organization), every state the Decisions name (email on and off, expired, cancelled, ` +
          `timezones west and east of UTC, and so on) and every downstream consumer (activity ` +
          `feed, counters, portal, emails, paper trail, Spanish text). ` +
          `${PROBE_RULES(`r1_area${i + 1}`)}\n${releaseBar()}\n` +
          `Return findings and the behaviors you confirmed hold.`,
        { label: `redteam:r1:${a.name}`, phase: "Red team", schema: SWEEP, model: "opus", effort: "medium" },
      ),
    ),
  );
  const r1 = await mergeRound(1, sweeps);
  const fixed1 = r1?.confirmed ?? [];
  followUpCount += r1?.followUps ?? 0;
  report.redTeam.push({ round: 1, fixed: fixed1.map((f) => `[${f.severity}] ${f.summary}`), followUps: r1?.followUps ?? 0, dropped: r1?.dropped ?? 0 });
  await fixRound(1, fixed1);
  if (report.stopped || !fixed1.length) return fixed1;

  // Round 2 attacks round 1's fixes and their callers. It may read the fix commits, nothing else
  // from history. A fresh sweep always finds something, so there is no round 3.
  const sweep2 = await agent(
    `Red-team round 2: attack the fixes made for these round 1 findings, and every caller of ` +
      `what they changed:\n${bullets(fixed1)}\n` +
      `${redTeamSources().replace("and you may not run git log, git diff or git show. ", "")}` +
      `You may read only the round 1 fix commits (\`git log --grep "red team round 1"\`, then ` +
      `\`git show\`) and no other history. Look for a fix that holds only at the site named, a ` +
      `caller left broken, a test that asserts the symptom instead of the rule, and anything the ` +
      `fix made visibly worse. ${PROBE_RULES("r2")}\n${releaseBar()}\nReturn findings and what you confirmed holds.`,
    { label: "redteam:r2", phase: "Red team", schema: SWEEP, model: "opus", effort: "medium" },
  );
  const r2 = await mergeRound(2, [sweep2]);
  const fixed2 = r2?.confirmed ?? [];
  followUpCount += r2?.followUps ?? 0;
  report.redTeam.push({ round: 2, fixed: fixed2.map((f) => `[${f.severity}] ${f.summary}`), followUps: r2?.followUps ?? 0, dropped: r2?.dropped ?? 0 });
  await fixRound(2, fixed2);
  return [...fixed1, ...fixed2];
}

// ─── Run ─────────────────────────────────────────────────────────────

phase("Guard");
const guard = await agent(
  `Prepare the repository for an unattended run. Do each step and report problems instead of ` +
    `working around them.\n` +
    `1. Report the current branch. If the working tree has uncommitted changes other than ` +
    `docs/*.md and .claude/workflows/, stop and report them.\n` +
    `2. PostgreSQL answers (\`pg_isready\`), \`mix deps.get\` and \`pnpm install\` succeed, and ` +
    `\`mix ecto.migrate\` applies any pending migrations to the dev database.\n` +
    `3. Baseline: run \`mix test\` (Bash timeout: 600000, not in the background) and ` +
    `\`pnpm assets:test\`, and list every test that already fails, so later gates don't blame ` +
    `this run for it.\n` +
    `Return ready only when steps 1 and 2 succeeded.`,
  { label: "guard", phase: "Guard", schema: GUARD, model: "sonnet", effort: "low" },
);
baseline = guard?.baselineFailures ?? [];
if (!guard?.ready) return { stopped: "guard failed", problems: guard?.problems ?? ["guard returned nothing"] };

if (!givenPlan) {
  phase("Plan");
  PLAN = await agent(
    `Write the implementation plan for this task: "${taskText}". If it names an entry of ${TODO}, ` +
      `read that entry in full. Read the code the task touches first, end to end, and grep every ` +
      `caller of what it changes. Write the plan to docs/<short-kebab-name>.md, using ${PLAN_MODELS} ` +
      `as models for structure and level of detail. It must have, in this order:\n` +
      `- "# <Title>", then a line "Branch: \`feat/<name>\`" (or fix/ for a bug fix).\n` +
      `- "## Goals", "## Decisions", "## Codebase Findings That Shape the Design": everything a ` +
      `red team needs to judge the result without reading the phases.\n` +
      `- One "## Phase <n> — <Title>" per shippable step, in build order, each with its steps, ` +
      `a Tests list (one test per rule) and a line "Commit: \`<conventional commit message>\`". ` +
      `Prefer few phases; one is fine for a small task.\n` +
      `- "## Browser Cases": cases a person can check on screen, each "- <ID> (email on|email ` +
      `off): <what to do and what the screen must show>". Add email off cases only when the ` +
      `task touches anything that sends email. None when the task has no visible effect.\n` +
      `- "## Red-Team Areas": two to four areas, each "- <name>: <what to attack>. Start: <files>".\n` +
      `- "## Out of Scope".\n` +
      `- "## Decisions Needed": only choices the product owner must make before building, each ` +
      `with the options and your recommendation. Omit the section when there are none.\n` +
      `Do not write product code. Return only the plan path.`,
    { label: "plan", phase: "Plan", model: "opus", effort: "high" },
  );
  PLAN = String(PLAN ?? "").trim().match(/docs\/[\w.-]+\.md/)?.[0] ?? "";
  if (!PLAN) return { stopped: "the plan step returned no plan path" };
}

if (!redTeamOnly && !fromWord) {
  phase("Plan check");
  const check = await agent(
    `Check the plan ${PLAN} against its task` +
      (givenPlan ? ` (its Goals, and the ${TODO} entry it came from, if any). ` : `: "${taskText}". `) +
      `Read the code it touches. Report every part of the task the plan misses or gets wrong, ` +
      `every "one shared fix covers all" claim with no caller list, every phase without tests, ` +
      `every test that asserts a symptom instead of the rule, and every product choice the plan ` +
      `makes silently. Do not resolve a product choice yourself. Change nothing.`,
    { label: "plan-check", phase: "Plan check", schema: PLAN_CHECK, model: "opus", effort: "high" },
  );
  const gaps = check?.gaps ?? [];
  if (gaps.length) {
    log(`plan check: ${gaps.length} gap(s), revising the plan`);
    phase("Plan");
    await agent(
      `Revise ${PLAN} for each gap below. A gap that needs a product choice goes under ` +
        `"## Decisions Needed" with the options and your recommendation; fix the rest in the ` +
        `plan. Do not write product code.\n${gaps.map((g) => `- ${g}`).join("\n")}`,
      { label: "plan-revise", phase: "Plan", model: "opus", effort: "high" },
    );
  }
}

phase("Setup");
const shape = await agent(
  `1. Read ${PLAN} and return its shape: title, the Branch line, each "## Phase" with its Commit ` +
    `line, each Browser Case, each Red-Team Area, and each entry under "## Decisions Needed". ` +
    `emailBoth is true when any Browser Case is marked email off.\n` +
    `2. Branch: the work happens on the plan's branch. If it is checked out, stay. If it exists, ` +
    `check it out. Otherwise create it from the current branch, carrying the uncommitted plan; ` +
    `never create it while main has uncommitted changes other than ${PLAN}. Return as base the ` +
    `branch it was created from (for an existing branch, its PR base from \`gh pr view --json ` +
    `baseRefName\`, else main).\n` +
    `3. If ${PLAN} is uncommitted, commit it alone as "docs: plan <title in lowercase>" ` +
    `${CO_AUTHOR}. ${COMMIT_RULE}`,
  { label: "setup", phase: "Setup", schema: SHAPE, model: "sonnet", effort: "low" },
);
if (!shape?.phases?.length) return { stopped: `could not read the phases of ${PLAN}`, shape };
TITLE = shape.title;
const phaseCount = shape.phases.length;
const startPhase = redTeamOnly ? phaseCount + 1 : fromWord ? Number(fromWord.slice(5)) : 1;
if (startPhase < 1 || (fromWord && startPhase > phaseCount)) {
  return { stopped: `${fromWord} is outside the plan's ${phaseCount} phase(s)` };
}

// Building on a guess would bake it in; the product owner answers in the plan and reruns.
if (shape.decisionsNeeded.length) {
  return {
    stopped: `${PLAN} has open product decisions. Answer them in the plan (move each into ` +
      `"## Decisions" and delete "## Decisions Needed"), then rerun with args "${PLAN}".`,
    plan: PLAN,
    branch: shape.branch,
    decisionsNeeded: shape.decisionsNeeded,
  };
}

for (const p of shape.phases) {
  if (p.n < startPhase) continue;
  log(`Phase ${p.n} of ${phaseCount}: ${p.title}`);
  await build(
    `phase${p.n}`,
    `Implement Phase ${p.n} of ${PLAN}, and only that phase. Read the whole plan first: Decisions ` +
      `and Codebase Findings apply to every phase, and earlier phases' Implementation Notes say ` +
      `where the build already differs from the plan. Write every test the phase lists, Playwright ` +
      `specs included (assets/e2e/, signing users in like questionnaire-links.spec.ts). For a bug ` +
      `fix, write the regression test first and see it fail. Run the ExUnit and Vitest files you ` +
      `touch; do not run Playwright (gate 2 runs it once all phases are built). `,
  );
  phase("Evidence");
  const ev = await agent(
    `Check the tests of Phase ${p.n} of ${PLAN} against the code just built (uncommitted). For ` +
      `every rule in that phase's Tests list: find the test that covers it, or write it. Break ` +
      `the rule in the product code with the smallest edit, run that test file, see it fail, then ` +
      `restore the product file exactly (\`git diff\` on it must match what it was before). A rule ` +
      `whose test still passes when broken gets a better test. Do not commit.`,
    { label: `evidence:phase${p.n}`, phase: "Evidence", schema: EVIDENCE, model: "sonnet", effort: "medium" },
  );
  const g = await buildAndGate(`phase${p.n}`, p.commit);
  report.phases.push({
    phase: p.n,
    commit: g?.commit ?? "",
    gate1: String(g?.report ?? "").slice(0, 300),
    weakTests: (ev?.rules ?? []).filter((r) => !r.failsWhenBroken).map((r) => r.rule),
  });
  if (report.stopped) return { plan: PLAN, branch: shape.branch, ...report };
}

// Browser tests run once all code is in, then again only if the red team changed code.
if (!(await browserGate("after-build", shape, { withExplore: true }))) return { plan: PLAN, branch: shape.branch, ...report };

const redTeamFixes = await redTeam(shape);
if (report.stopped) return { plan: PLAN, branch: shape.branch, ...report };

if (redTeamFixes.length) {
  phase("Fix review");
  const review = await agent(
    `Review the red-team fixes of this run; look for nothing new. They are the commits whose ` +
      `message contains "red team round" (\`git log --grep\`, then \`git show\`). ` +
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
    if (report.stopped) return { plan: PLAN, branch: shape.branch, ...report };
  }
  // A repaired fix passes gate 1 and the browser rerun, but is not reviewed a second time.
  report.fixReview = review?.held ? "held" : { repairedNotReReviewed: review?.open ?? [] };
  if (!(await browserGate("after-red-team", shape, { withExplore: false }))) return { plan: PLAN, branch: shape.branch, ...report };
}

phase("Close");
const leftovers = [
  ...report.stillFailing.map((f) => `browser test still failing after its one rerun: ${f}`),
  ...[...new Set(report.flaky)].map((t) => `flaky test (failed once, passed on rerun): ${t}`),
  ...report.unchecked.map((c) => `browser case never checked on screen: ${c}`),
];
const close = await agent(
  `Close the run. 1. ${CHECKS} Fix nothing. 2. In ${PLAN}, make sure "## Implementation Notes" ` +
    `exists and lists every difference from the plan that \`git log ${shape.base}..HEAD\` shows ` +
    `("None." when there are none). Add each of these to ${followUps()}:\n` +
    `${leftovers.map((l) => `- ${l}`).join("\n") || "- (nothing)"}\n` +
    `3. If the task came from an entry of ${TODO} that this run resolved, delete that entry. ` +
    `4. If ${PLAN} or ${TODO} changed, commit them alone as "docs: record implementation notes" ` +
    `${CO_AUTHOR}. ${COMMIT_RULE}` +
    `5. Return, verbatim: the checks.sh summary lines, \`grep -n '^## ' ${PLAN}\`, ` +
    `\`grep -n '^## ' ${TODO}\`, \`git log --oneline ${shape.base}..HEAD\` and \`git status --short\`.`,
  { label: "close", phase: "Close", schema: CLOSE, model: "sonnet", effort: "low" },
);

// Verified from the command output the close step returns, not from its claims.
const closeProblems = [];
if (!close) closeProblems.push("the close step returned nothing");
else {
  if (!close.planHeadings.includes("## Implementation Notes")) closeProblems.push(`${PLAN} has no "## Implementation Notes"`);
  if ((followUpCount || leftovers.length) && !close.todoHeadings.includes(`## ${TITLE}`)) {
    closeProblems.push(`${TODO} has no "## ${TITLE}" section, yet ${followUpCount + leftovers.length} follow-up(s) were due`);
  }
  if (close.status.trim()) closeProblems.push(`uncommitted files left: ${close.status.trim()}`);
}

// Facts, not a verdict: the launching session summarises them for the user.
return { plan: PLAN, branch: shape.branch, base: shape.base, ...report, closeProblems, close };
