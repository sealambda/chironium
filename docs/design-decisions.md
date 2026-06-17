# Design Decisions

A running log of non-trivial UI/UX decisions, for cross-session consistency.

## 2026-06-15 — Nutrition plan redesign

**Surface:** patient detail → Nutrition Plan card, the add/edit dialog, and the Activity feed.

- **Macro identity (single source of truth).** Protein = red `Beef`, Carbs = amber `Wheat`, Fat = violet `Droplets`, centralised in `nutrition-macros.ts` (`MACRO_META`) and reused by the donut, card legend, dialog, and feed event so the three macros read identically everywhere. The brand `--chart-1..5` tokens were rejected for macros — they all cluster in the magenta/orange hue range and don't separate three series; distinct raw Tailwind hues (red ~25°, amber ~75°, violet ~290°) give accessible separation in light + dark.
- **Donut card.** The flat pill row + "View all" link were replaced with a hand-rolled SVG ring (no chart dependency added) — total kcal centred, three arcs sized by each macro's Atwater energy share, with a colored icon + grams + % legend. Arc geometry is a pure, unit-tested helper (`macroArcSegments`); the SVG circle uses circumference-100 (`r = 15.91549`) so percentages map 1:1 to dash length. Exposed as a single `role="img"` with an aria summary.
- **History via the Activity feed.** The standalone `/nutrition` history page and the "View all" link were removed; plan history now lives in the Activity feed as a first-class `nutrition` event kind (emerald accent, `Salad` icon) with its own filter pill, chronological like every other clinical record. This follows the established per-kind feed pattern rather than a bespoke surface.
- **Dialog: show all units at once, no switcher.** The per-macro unit dropdown was removed. Grams is the single editable unit (most canonical, what we persist); the equivalent **% kcal** and **g/kg** render live and read-only beside it, in that priority order. Each row carries the macro's color + icon and a lock toggle. BMR auto-suggest, the live balance meter, and one-click auto-balance are retained; balance stays a soft warning that never blocks save.

**Validation:** `tsc`/`tsc -b`, `biome` (274 files), Vitest (69), and `pnpm build` all green; design-QA screenshots reviewed at desktop + mobile via the project's Playwright dev-auth path.

## 2026-06-15 — Nutrition card: mobile-first overflow fix

- **Context:** The donut + legend overflowed and clipped the `%` column at narrow widths (the clinical card is ~340–376px at every breakpoint). An earlier review missed it because screenshots cropped the card *element* (which sizes to its content) instead of the card in the page.
- **Decision:** Make the legend shrink instead of overflow — `min-w-0` on the row + list, the macro name `truncate`s, and the grams/`%` columns are `shrink-0` so the data is never clipped. Donut reduced to `w-24` with an `text-xl` centre number so it fits the narrowest card.
- **Rationale:** Mobile-first; the card is essentially the same width at all breakpoints, so it must hold at 375px first. Validated full-viewport at 375/768/1280/1440 — 0px horizontal overflow, no clipping, light + dark.
- **Alternatives considered:** Stacking the donut above the legend on mobile — unnecessary once the legend shrinks cleanly, and it wastes vertical space.
- **Scope:** `nutrition-card.tsx`, `nutrition-donut.tsx`.
- **Visual language:** frontend-design baseline.

## 2026-06-17 — Nutrition Plan studio audit + P0/P1 hardening

- **Context:** Full studio audit of the Nutrition Plan feature — live design-QA + axe, a senior design-critic, and parallel frontend/backend code audits. Four independent passes converged on the same defects.
- **Decision:** Shipped the correctness/robustness fixes; deferred the two visual-redesign decisions for explicit direction.
  - **Backend (Ash):** bounded the API inputs (`target_kcal` 1–20 000, macros 0–2 000) so the GraphQL contract no longer trusts the client Zod schema; guarded the macro `*_perc` calculations against divide-by-zero on all-zero macros (and fixed their latent integer-truncation by forcing float division); added `default_sort inserted_at: :desc` to `patient.nutrition_plans` so the "current plan"/`limit` are deterministic server-side (mirrors `:observations`).
  - **Frontend:** made the empty nutrition card actionable (local "Add nutrition plan" button + `mode="add"` dialog via a new optional `action`/`emptyAction` slot on `CustomerDetailEmptyCard`/`TagsCardShell`); clamped negative typed input out of the live balance meter + macro read-outs; replaced the dialog's open-reset ref-flag with an item-id-keyed reset (no stale values on background refetch); added edge-case tests for `redistributeMacrosForTargetKcal` and negative-grams guards.
- **Deferred (need product direction):**
  - **Donut honesty + single % basis (P0):** the donut centre shows the *target* while the arcs always fill the ring from the *macro-energy* total, so an off-target plan reads as complete; and the same macro shows two percentages (card 17 % of macro-energy vs dialog 12.4 % of target). They resolve together — either % of target kcal everywhere + ring-as-adherence-gauge, or keep the pure split with a macro-total centre label. Held for the user's call.
  - **AA colour-contrast is systemic, not nutrition-specific:** the failures are the brand primary button (`#db2475` + white = 4.25:1), the `--muted-foreground` token on small text, and avatar fallbacks — all app-wide. To be fixed as a token adjustment, not a nutrition-only patch.
- **Rationale:** correctness/robustness changes are unambiguous and low-risk; the donut/% change is a genuine design fork the user should choose; contrast is a shared-token decision affecting the whole app.
- **Alternatives considered:** a nutrition-only contrast bump (rejected — would make the legend inconsistent with every other muted label); changing the redistribution algorithm for exact rounding (rejected — residual stays within the 10-kcal tolerance, so tests were added instead of risking a regression); exposing a real `insertedAt` to drop the `paperTrailVersions[0]` timestamp hack (deferred — cross-cutting across all `Tenantable` resources).
- **Scope:** `nutrition_plan.ex`, `patient.ex`, `nutrition-card.tsx`, `nutrition-plan-detail-dialog.tsx`, `macro-field.tsx`, `tags-card-shell.tsx`, `customer-detail-empty-card.tsx`, `nutrition-plan-utils.test.ts`.
- **Visual language:** frontend-design baseline.

## 2026-06-17 — Nutrition card: vertical layout, honest donut, g/kg, BMR clarity

- **Context:** User review of the live card. Resolves the studio's deferred P0 (donut honesty + single % basis) and reworks the layout per direction.
- **Decision:**
  - **Layout** — donut moved to the **top, centered, and enlarged** (`w-24`→`w-32`, centre kcal `text-xl`→`text-2xl`, ring stroke 4.5→4 for a roomier hole); macros **stacked below** in a compact **aligned grid** (`grid-cols-subgrid`, content-width name column) so name and values group tightly instead of edge-to-edge. Added a **g/kg** column alongside g and %. Populated body extracted to `NutritionCardContent`.
  - **Honest donut (gauge)** — new pure `macroAdherenceSegments(macros, targetKcal)` with `denom = max(target, macroTotal)`: under-target leaves a muted gap (the deficit), on/over fills the ring; the centre stays the target. A compact **±delta indicator** ("−834 / +884 kcal off target", `text-amber-800` for AA at 12 px) surfaces the gap on the card.
  - **Single % basis** — card legend + donut aria now compute **% of target kcal** (was % of macro-energy), so the card, donut and dialog all agree; aria reads as adherence ("2,045 of 2,879 kcal target. Protein 12% …").
  - **BMR clarity** — the disabled "Suggest from BMR" helper now names the **exact blocker** (e.g. "BMR needs a recorded male or female sex" — Mifflin–St Jeor has no constant for sex "Other"/"Unknown") instead of a misleading generic message. 7 of 15 seeded patients are "Other", so this was hit constantly.
- **Rationale:** the gauge + single basis make the headline chart honest (the deferred P0); the aligned grid + top donut free the horizontal room g/kg needs and fix the "name/values too separated" complaint; the BMR message stops reading as a bug.
- **Alternatives considered:** inline-grouped macro rows (rejected for the aligned grid — more scannable); a sex-neutral BMR estimate for "Other" (offered, deferred — needs clinical sign-off); keeping amber-600 for the delta (rejected — 3.19:1 fails AA; amber-800 passes).
- **Validation:** `pnpm quality`/`build`/`test` (76) green. Live design-QA + axe at 375 → 1280: under-target (Marilou) shows the gap + "−834"; over-target (Lulu) fills the ring + "+884"; g/kg populates; % matches the dialog; mobile 360 px wide, no overflow; the amber delta now clears AA (the rest of the contrast findings are the known app-wide tokens).
- **Scope:** `nutrition-card.tsx`, `nutrition-donut.tsx`, `nutrition-plan-utils.ts` (+ `.test.ts`), `nutrition-plan-detail-dialog.tsx`, `messages/{en,es}.json`.
- **Visual language:** frontend-design baseline.
