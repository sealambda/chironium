# Design Decisions

A running log of non-trivial UI/UX decisions, for cross-session consistency.

## 2026-06-15 — Nutrition plan redesign

**Surface:** patient detail → Nutrition Plan card, the add/edit dialog, and the Activity feed.

- **Macro identity (single source of truth).** Protein = red `Beef`, Carbs = amber `Wheat`, Fat = violet `Droplets`, centralised in `nutrition-macros.ts` (`MACRO_META`) and reused by the donut, card legend, dialog, and feed event so the three macros read identically everywhere. The brand `--chart-1..5` tokens were rejected for macros — they all cluster in the magenta/orange hue range and don't separate three series; distinct raw Tailwind hues (red ~25°, amber ~75°, violet ~290°) give accessible separation in light + dark.
- **Donut card.** The flat pill row + "View all" link were replaced with a hand-rolled SVG ring (no chart dependency added) — total kcal centred, three arcs sized by each macro's Atwater energy share, with a colored icon + grams + % legend. Arc geometry is a pure, unit-tested helper (`macroArcSegments`); the SVG circle uses circumference-100 (`r = 15.91549`) so percentages map 1:1 to dash length. Exposed as a single `role="img"` with an aria summary.
- **History via the Activity feed.** The standalone `/nutrition` history page and the "View all" link were removed; plan history now lives in the Activity feed as a first-class `nutrition` event kind (emerald accent, `Salad` icon) with its own filter pill, chronological like every other clinical record. This follows the established per-kind feed pattern rather than a bespoke surface.
- **Dialog: show all units at once, no switcher.** The per-macro unit dropdown was removed. Grams is the single editable unit (most canonical, what we persist); the equivalent **% kcal** and **g/kg** render live and read-only beside it, in that priority order. Each row carries the macro's color + icon and a lock toggle. BMR auto-suggest, the live balance meter, and one-click auto-balance are retained; balance stays a soft warning that never blocks save.

**Validation:** `tsc`/`tsc -b`, `biome` (274 files), Vitest (69), and `pnpm build` all green; design-QA screenshots reviewed at desktop + mobile via the project's Playwright dev-auth path.
