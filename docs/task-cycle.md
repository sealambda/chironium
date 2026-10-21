# Task Cycle

`task-cycle` (`.claude/workflows/task-cycle.js`) is a Claude Code workflow that takes one task from plan to reviewed commits without supervision. It writes or reuses a plan under `docs/`, builds it phase by phase, runs the browser tests, red-teams the result, and records what is left in `docs/TODO.md`.

## Running It

In Claude Code, type one of these:

```
/task-cycle add a reminder counter to the side menu   # new task: writes the plan, then builds it
/task-cycle docs/<name>.md                            # existing plan, or a rerun after answering its decisions
/task-cycle docs/<name>.md from:3                     # start at build phase 3; earlier phases are committed
/task-cycle docs/<name>.md redteam                    # skip building; browser tests, red team and close only
```

The task can also name an entry of `docs/TODO.md`; the plan step reads it, and the close step deletes it once resolved.

## What It Does

1. **Guard**: checks for a clean working tree, runs `mix deps.get`, `pnpm install` and `mix ecto.migrate`, and records the tests that already fail.
2. **Plan**: writes `docs/<name>.md`, modelled on `docs/email-optional-and-pending-work.md`, with Goals, Decisions, phases with tests and commit messages, Browser Cases and Red-Team Areas.
3. **Plan check**: an agent that did not write the plan compares it with the task, and the plan is revised for each gap.
4. **Setup**: creates or checks out the plan's branch and commits the plan.
5. **Build**: one plan phase at a time. Each phase is followed by an evidence check (every rule has a test that fails when the rule breaks) and Gate 1 (`.claude/workflows/checks.sh`), and is committed when green.
6. **Gate 2**: runs the Playwright suite, with email on and off when the task touches email, then checks screenshots of every Browser Case at 1440px and 375px.
7. **Red team**: round 1 attacks each area from the requirements alone; round 2 attacks the fixes. A fix review then confirms each fix held.
8. **Close**: runs the checks one last time, completes the plan's Implementation Notes, and adds follow-ups to `docs/TODO.md` under the plan's title.

## When It Stops

- **Open product decisions**: the plan lists them under `## Decisions Needed`. Answer each one, move it into `## Decisions`, delete the section, and rerun with the plan path.
- **Gate 1 stays red** after one repair attempt: fix the cause, then rerun with `from:<n>`.
- **Gate 2 is blocked** (port 4000 taken, database down): fix the cause, then rerun with `redteam`. Resuming the old run would replay the blocked result.

## Reading the Result

The run returns facts, and the launching session summarises them. Read these first:

- `stopped`: why the run ended early, if it did.
- `decisionsNeeded`: questions only the product owner can answer.
- `preexistingP0`: serious problems that predate the task, each fixed in its own commit so it can be cherry-picked onto the base branch.
- `unchecked`: Browser Cases no agent managed to check on screen.
- `closeProblems`: what the close step was supposed to do but didn't, checked against command output.

Nothing is pushed; open the pull request yourself.
