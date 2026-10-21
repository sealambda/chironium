# Design Decisions

A running log of non-trivial UI/UX and architecture decisions, for cross-session consistency.

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

## 2026-09-25 — One API endpoint per role

- **Context:** Patients now sign in through questionnaire links (`docs/patient-questionnaire-links.md`), and over time they'll be able to do much more on the platform. One person can be both a patient and a practitioner, and one browser can hold a staff session and a patient session at once.
- **Decision:** The endpoint picks the role:
  - `/gql` resolves staff principals only: a `User` or a `Practitioner`, with the tenant from the header after a membership check.
  - `/portal/gql` resolves patient principals only: today the `GuestAccess` link session, later a patient grant. The tenant comes from the credential and the header is ignored.
  - Both serve the same GraphQL schema, and the Ash policies behind them are identical. Policies stay the authorization boundary; the matrix test proves a `%Patient{}` actor can do only the allowlisted actions, whatever the endpoint.
- **Rationale:**
  - **The role is declared, never inferred.** A single endpoint would have to pick between sessions or grants by precedence, which is the trap the plan found in `ActorResolver`: map order silently turned dual-role users into patients. With one route per role there's nothing to guess, and `/gql` provably ignores guest sessions.
  - **Each surface gets its own hardening as a plain Phoenix pipeline.** The patient pipeline is persisted-documents only, CSRF-protected, rate-limited, has no PostHog and sends `no-referrer`. None of that is an `if patient` branch inside a shared pipeline, where a forgotten branch would be the failure mode. The patient path never runs `SetTenant`, and the staff path never runs `SetPortalActor`.
  - **It mirrors how clinical systems draw the line.** SMART on FHIR separates `patient/*` from `user/*` scopes and fixes the context at authorization time, and staff and patient portals usually ship as separate products.
- **Alternatives considered:**
  - **One endpoint that infers the role from the sessions present.** Rejected: it needs a precedence rule, and every hardening step becomes conditional.
  - **One endpoint plus an explicit role header, validated on the server.** Just as secure, and the right design if one SPA ever offers a "view as patient" switch. It's the same split expressed as a header, though. The persisted-only rule would then need a custom Absinthe document provider that inspects the actor, because providers are configured per plug.
  - **A separate patient GraphQL schema.** It would give the smallest surface, with even introspection hiding staff types. It isn't worth duplicating the AshGraphql config while the persisted allowlist plus policies already limit what patients can run.
  - **REST controllers for the patient side.** Rejected: it would be simpler for v1's two operations, but patients will do a lot more over time. It would also lose generated types and split the API conventions.
  - **A separate origin for the portal** (for example `portal.…`, possibly a second Phoenix endpoint in the same release). Not now, and likely later. It builds on this decision rather than replacing it: separate cookie jars, so staff sign-out no longer clears a guest session and an XSS on one side can't ride the other's session, plus a simpler CSP and referrer policy. The cost is DNS, TLS and deployment work.
- **Consequences:**
  - Two frontend clients: the staff SPA (`src/main.tsx`) and the portal (`src/portal.tsx`), each with its own GraphQL client.
  - New patient features add persisted documents (`pnpm gql:persisted`; CI fails if the manifest is stale) and widen the patient allowlist in `patient_actor_matrix_test.exs`.
  - A dual-role person uses the staff app for work and the portal for their own care.
  - Staff and guest sessions share one cookie until the portal moves to its own origin.
- **Scope:** `lib/chironium_web/router.ex` (the `:graphql`, `:portal_graphql` and `:portal_browser` pipelines), `ChironiumWeb.SetTenant`, `ChironiumWeb.Plugs.SetPortalActor`, `ChironiumWeb.PortalDocuments`.

## 2026-10-21 — Calendar dates follow the organization's timezone

- **Context:** Questionnaire due dates and reminders are picked as calendar days and stored as instants. The browser turned each day into an instant in its own zone, so a practitioner abroad, or two staff in different zones, stored different instants for the same day. The app, the portal and emails each showed dates in another zone: the viewer's browser, the patient's browser, and UTC.
- **Decision:** Each organization has an IANA `timezone`, prefilled from the creator's browser and editable in Settings. Existing organizations start at `Etc/UTC`.
  - The client still sends instants, but converts picked days in the organization's zone (`toDateTimeStart`/`toDateTimeEnd` with a `timeZone`). The task and questionnaire APIs don't change.
  - Due dates and reminder dates display in the organization's zone: on the Pending page, the activity feed's questionnaire requests, the reminder button and edit dialog, the portal (`Task.organization_timezone`), and emails. The activity feed still groups events by day in the browser's zone.
  - Reminders created before this change were saved at the browser's local midnight. Read in `Etc/UTC`, those from east of UTC show a day early until the organization's timezone is set.
- **Alternatives considered:** Sending a plain date and converting on the server. Reminders go through the generic `createTask`/`updateTask` with `requestedPeriod`, so it would need new date arguments there as well as undoing the `due_at` argument, for the same result.
- **Scope:** Questionnaire requests and reminders. Clinical dates, such as condition onsets or medication periods, still use the browser's zone.
