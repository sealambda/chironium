# Public Demo Mode — Implementation Plan

Branch: `feat/demo-mode`

A demo mode for running a public Chironium demo. A visitor clicks "Try the demo", gets a private organization full of fake data, and explores the app. Demos older than 24 hours are deleted by a recurring cleanup job. Demo mode is off unless `DEMO_MODE` is set, and a normal instance never notices it.

## Goals

- A visitor can try Chironium in one click, without an account, email or password.
- Visitors never see each other's data.
- Demo data, including anything real a visitor types by mistake, is gone within about 48 hours: kept for 24 hours, then deleted by the next cleanup run.
- Demo mode can never delete or expose anything on a normal instance.
- A demo instance never sends email or data to a third party.

## Decisions

1. **Switch:** `DEMO_MODE=true` turns demo mode on. A demo runs as its own instance with its own database and secrets. It refuses to boot with any email, external sign-in or analytics setting (N2).
2. **One organization per visitor.** The visitor owns it, so they can try everything, including settings and invitations. They can't create a second one (N3).
3. **Sign-in:** only a "Try the demo" button. It creates a throwaway user `demo-<random>@demo.invalid` and signs them in by setting the session directly. `.invalid` is a reserved domain that can never receive email. Email, Google, OpenID Connect and the developer sign-in are hidden. A visitor who loses their cookie starts a new demo.
4. **Cleanup:** an hourly Oban cron job (N8) deletes organizations older than 24 hours whose owner and members are all demo users, including each organization's database schema, then deletes demo users older than 24 hours left without an organization.
5. **Banner:** every app page and every patient portal page (N6) shows "Demo: your data is deleted after 24 hours. Don't enter real client data." and a "Made by Sealambda" link to `https://sealambda.com`.
6. **Database settings:** without `DATABASE_URL`, production connects over the PostgreSQL Unix socket as user `chironium` to database `chironium`. Add `DATABASE_NAME` and `DATABASE_USERNAME`, both defaulting to `chironium`, so a demo can share a PostgreSQL server with another instance.
7. **Limits:** 20 demo starts per IP per hour (N5) and at most 200 live demo organizations (N4).

Answered before building (the phases below follow each answer):

- **N1. Scope:** this plan, as written, is the task.
- **N2. Boot refusal:** `DEMO_MODE` refuses to boot when `RESEND_API_KEY`, Google, OpenID Connect or `POSTHOG_API_KEY` is set, naming the variable. One check in `runtime.exs` closes every email and third-party path.
- **N3. More organizations:** in demo mode, the `create` action on `Organization` is forbidden for every actor; `Demo.start/0` seeds with `authorize?: false`.
- **N4. Global cap:** at most 200 live demo organizations. Past it, `POST /demo` redirects to `/sign-in` with "The demo is full right now. Please try again later."
- **N5. Per-IP limit:** 20 starts per IP per hour, so a shared office or conference network isn't blocked; the global cap is the real ceiling.
- **N6. Banner:** the app shell and the patient portal layout, where a visitor is most likely to type real data.
- **N7. Failed start:** no wrapping transaction. On any error, `Demo.start/0` deletes what it created with the cleanup's delete functions, logs `[Demo] Start failed:` with the reason, and the controller redirects to `/sign-in` with "Couldn't start the demo. Please try again."
- **N8. Cleanup schedule:** hourly (`"0 * * * *"`). Oban Cron skips runs missed while the instance is down, so a daily run could break the 48-hour goal.

## Codebase Findings That Shape the Design

1. **Seeding.** The same list of seed steps exists three times: `Chironium.Release.seed/1` (`lib/chironium/release.ex:73`), `Mix.Tasks.Chironium.Seed.run/1` (`lib/mix/tasks/chironium/seed.ex`), and soon `Demo.start/0`. `Seed.Organization.seed/1` creates its own user `seed-<n>@example.com` and defaults the slug to `seed-org-#{System.unique_integer([:positive])}`; `Generator.organization` falls back to the sequence `org-N`. Both counters restart on every boot. Faker is a production dependency, so seeding works in the release.
2. **Signing in without a strategy.** `DevSignInController` and `PlaywrightE2EController` (`lib/chironium_web/controllers/playwright_e2e_controller.ex:60-71`) each mint a token with `AshAuthentication.Jwt.token_for_user/4`, put it in the user's metadata and call `store_in_session/2`. `DevSignInController` is mounted only with `:dev_routes`, so the shared helper can't live there.
3. **Organizations are database schemas.** `Organization` uses `manage_tenant` with the template `["org_", :id]` (`lib/chironium/accounts/organization.ex:17`). Creating one runs every tenant migration, which takes seconds. Destroying the record does **not** drop the schema.
4. **Foreign keys block deletion.** No foreign key into public `organizations` or `users` has an ON DELETE action (`priv/resource_snapshots/repo`). `Organization`, `OrganizationUser`, `Invitation`, `GuestAccess` and `User` use AshPaperTrail, so an Ash destroy writes a new version row pointing at the record being deleted. Every `*_versions` table has `changed_by_id → users` with `on_delete: :nothing`, and seeding with `actor: user` already writes such a row. Tenant tables (`principal_grants`, tenant `*_versions`) reference public `users` and `invitations`, so the schema must go first. `User` has no destroy action (`defaults [:read]` in `lib/chironium/accounts/user.ex`). `tokens` has no foreign key; rows are keyed by `subject`, such as `user?id=<id>` and `guest?id=<id>`. Cleanup therefore uses SQL in a fixed order, not Ash destroys.
5. **Oban cron.** `config/config.exs:35` sets `plugins: [{Oban.Plugins.Cron, []}]`, and `AshOban.config/2` (`lib/chironium/application.ex`) appends its schedulers, such as the hourly `send_reminder`, to that plugin's `crontab` (`put_crontab` in `deps/ash_oban/lib/ash_oban.ex`). A crontab set in `runtime.exs` is extended, not replaced; Phase 4 tests this.
6. **Rate limiting.** `ChironiumWeb.Plugs.PortalRateLimit` throttles unauthenticated paths per IP using path-prefix buckets, but reads one global `config[:scale_ms]` for every bucket. `config/test.exs` raises the existing limits to 10_000.
7. **Sign-in page.** `ChironiumWeb.SignInLive` shows each configured method from `:sign_in_providers` and `Notifications.email_enabled?/0`. In demo mode it shows only the demo button.
8. **Production boot check.** `config/runtime.exs` refuses to boot in production with no sign-in method. Demo mode must count as a method. Evaluating the file with `env: :prod` also needs `SECRET_KEY_BASE` and `TOKEN_SIGNING_SECRET`, and calls `PhoenixVite.cache_static_manifest_latest/1`, which parses `priv/static/.vite/manifest.json`; a test run may not have that file (commit d908f41).
9. **SPA flags.** The root layout already passes flags to the React app through meta tags, for example `chironium:email-enabled` read by `assets/src/shared/utils/email-enabled.ts`. Add `chironium:demo` the same way.

## Phase 1 — Demo Mode Switch and Database Settings

- `config/runtime.exs`:
  - `demo_mode? = System.get_env("DEMO_MODE") in ~w(true 1)`, then `config :chironium, :demo_mode?, demo_mode?`.
  - The production "no sign-in method" check also passes when demo mode is on.
  - When demo mode is on, raise if `RESEND_API_KEY`, Google, OpenID Connect or `POSTHOG_API_KEY` is set (N2): `"DEMO_MODE is set, so RESEND_API_KEY must be unset. A demo never sends email or data to third parties."`, naming each variable that is set. This check runs in every environment except `:test`, whose email is always on.
  - In the Unix-socket branch, read `DATABASE_NAME` and `DATABASE_USERNAME`, both defaulting to `chironium`.
- `Chironium.Demo` module: `enabled?/0` reads the setting.

**Tests** (`test/chironium/config/runtime_test.exs`, `async: false`)
- Each case evaluates `config/runtime.exs` with `Config.Reader.read!/2` and `env: :prod`.
- Setup saves every variable the file reads that the test touches (`DEMO_MODE`, `SECRET_KEY_BASE`, `TOKEN_SIGNING_SECRET`, `DATABASE_URL`, `DATABASE_NAME`, `DATABASE_USERNAME`, `RESEND_API_KEY`, the `GOOGLE_*` and `OIDC_*` variables, `POSTHOG_API_KEY`), then sets the two secrets and deletes the rest, since the test environment's dotenv files may have set some. `on_exit` restores each one, deleting those that were unset.
- If `priv/static/.vite/manifest.json` is missing, setup writes `{}` there and `on_exit` removes it. It never touches a manifest it didn't create.
- With no sign-in method and no `DEMO_MODE`, evaluating raises "No sign-in method is configured". With only `DEMO_MODE=true`, it returns config with `demo_mode?: true`. The pair shows the rule, not a check that never raises.
- `DEMO_MODE=true` with `RESEND_API_KEY` set raises and names `RESEND_API_KEY`; the same for `POSTHOG_API_KEY`.
- The socket branch uses `DATABASE_NAME` and `DATABASE_USERNAME` when set, and `chironium` for both without them.

Commit: `feat(demo): add a demo mode switch`

## Phase 2 — Start a Demo

- **Shared seeding.** Add `Mix.Tasks.Chironium.Seed.All.seed(tenant, opts)` in `lib/mix/tasks/chironium/seed/all.ex`. It runs the steps from practitioners through clinical notes, takes `patients:`, `practitioners:` and a `log:` function, and returns the practitioners and patients. Its three callers:
  - `Release.seed/1`, with `log: &IO.puts/1`;
  - `Mix.Tasks.Chironium.Seed.run/1`, with `log: &Helpers.info/1`;
  - `Demo.start/0`, with a no-op `log`.
  The invitation stays out of the shared function: `Release.seed/1` and the mix task keep calling `Organization.seed_invitation/4` themselves, and a demo creates no invitation.
- `Seed.Organization.seed/1`: accept `user:` and use it instead of creating one. The existing `name:` and `slug:` options stay.
- **Slug.** `Demo.start/0` generates one 16-character url-safe random token and uses it for both the email `demo-<token>@demo.invalid` and the slug `demo-<token>`, lowercased. Uniqueness then rests on the random value, not on a counter that restarts on every boot.
- `Chironium.Demo.start/0`:
  1. returns `{:error, :full}` if the number of organizations owned by `@demo.invalid` users has reached `Application.get_env(:chironium, :demo_max_organizations, 200)` (N4);
  2. creates the user with `Ash.Seed`;
  3. seeds an organization named "Demo Clinic" with the slug above, owned by that user, with `authorize?: false` (N3), and runs `Seed.All.seed/2` with 15 patients and 3 practitioners;
  4. returns `{:ok, user}`. On any error it deletes the user and organization it created with `Chironium.Demo.Cleanup.delete_organization/1` and `delete_user/1` from Phase 4, logs `[Demo] Start failed:` with the reason, and returns `{:error, reason}` (N7). Phase 2 builds those two functions early, since Phase 4 reuses them.
- **Shared sign-in.** Add `ChironiumWeb.SessionSignIn.sign_in(conn, user)` in `lib/chironium_web/session_sign_in.ex`. It mints the token, puts it in the user's metadata and calls `store_in_session/2`, returning `{:ok, conn}` or `:error`. `DevSignInController`, `PlaywrightE2EController` and `DemoController` call it. `PlaywrightE2EController` keeps its own `delete_session(:auth_return_state)` and its 500 on `:error`.
- `POST /demo` → `ChironiumWeb.DemoController.create/2`. Routes compile before runtime config, so a plug checks `Demo.enabled?/0` and returns 404 when demo mode is off. The action starts a demo, signs the user in and redirects to `/app`. On `{:error, :full}` or any other error it redirects to `/sign-in` with the matching message from N4 or N7.
- `Organization` `create` policy: `forbid_if Chironium.Demo.Checks.DemoMode` before the `StaffActor` check (N3).
- `PortalRateLimit`:
  - a `demo` bucket for `["demo"]`, with `demo_limit: 20` and `demo_scale_ms: 3_600_000` in `@defaults` (N5);
  - `check/2` reads `config[:"#{bucket}_scale_ms"] || config[:scale_ms]`, so the existing buckets keep the global window;
  - `config/test.exs` adds `demo_limit: 10_000` next to the existing overrides.
- Measure how long `Demo.start/0` takes and record it in the Implementation Notes. If it's over 10 seconds, add a follow-up for a pool of pre-seeded organizations.

**Tests**
- `POST /demo` with demo mode on creates a `@demo.invalid` user who owns exactly one organization with 15 patients and slug `demo-<token>` matching the email's token, signs them in, and redirects to `/app`.
- `Demo.start/0` succeeds when organizations with slugs `seed-org-1` to `seed-org-5` and `org-1` to `org-5` already exist, standing in for organizations left from before a restart.
- With demo mode off, `POST /demo` returns 404.
- With 200 demo organizations, `POST /demo` redirects to `/sign-in` with the "demo is full" message and creates nothing. The test lowers the cap through application config rather than creating 200 schemas.
- When seeding raises (inject a failing step), no user, organization or `org_<id>` schema is left, and the response redirects with the retry message.
- In demo mode, `createOrganization` through GraphQL as a demo user returns a forbidden error and creates no schema. With demo mode off, the same mutation still works.
- The 21st start from one IP within an hour gets 429. The test is `async: false`, sets `demo_limit: 20` with `Application.put_env/3` and restores the previous value in `on_exit`, as `test/chironium_web/portal_test.exs:231` does.
- The existing `DevSignInController` and `PlaywrightE2EController` tests still pass on the shared helper.
- `mix chironium.seed` and `Release.seed/1` still create an organization, its data and an invitation.

Commit: `feat(demo): start a private demo organization in one click`

## Phase 3 — Sign-In Page and Banner

- `SignInLive`: in demo mode, show only a heading ("Try Chironium"), one sentence ("Explore a private demo clinic with fake data. No account needed."), a "Try the demo" button that posts to `/demo`, and the note "Your demo is deleted after 24 hours." Hide every other sign-in method, including the developer form. Show the flash from a failed or full demo.
- Root layout: `<meta name="chironium:demo" content="true">` when demo mode is on. Add `isDemo()` in `assets/src/shared/utils/` next to `email-enabled.ts`.
- `DemoBanner` component at the top of the app shell, with the text from decision 5. Follow AGENTS.md: one responsive component, standard Tailwind tokens only.
- Portal layout (`portal_root.html.heex`): the same banner text when demo mode is on (N6).
- Translations: Gettext for the sign-in page and the portal banner, Paraglide for the app banner, in English and Spanish.

**Tests**
- The sign-in page in demo mode shows the demo button and none of the `sign-in-*` provider elements.
- The page controller test sees the `chironium:demo` meta tag when demo mode is on, and doesn't see it when it's off.
- A portal page shows the banner in demo mode and not otherwise.
- A Vitest test checks that the banner renders only when `isDemo()` is true.

Commit: `feat(demo): show only the demo on the sign-in page, and a banner in the app`

## Phase 4 — Recurring Cleanup

- `Chironium.Demo.Cleanup` holds the selection and deletion SQL. It runs through `Repo.query!/2` with parameters, never Ash destroys: those write new version rows (finding 4) and `User` has no destroy action.
- **Which organizations.** An organization is due when all of these hold:
  - `inserted_at < now() - interval '24 hours'`;
  - its owner's email ends in `@demo.invalid` (case-insensitive);
  - no row in `organization_users` for it belongs to a user whose email doesn't end in `@demo.invalid`.
  Checking both `owner_id` and `organization_users` keeps an organization whose owner is real even if every member is a demo user, and the reverse.
- **`delete_organization(id)`**, in one transaction, in this order:
  1. `DROP SCHEMA IF EXISTS "org_<id>" CASCADE`. This removes every tenant table, including `principal_grants` and the tenant `*_versions` tables that reference public `users` and `invitations`. The ID comes from the database as a UUID, so it is safe to interpolate.
  2. `DELETE FROM tokens WHERE subject = ANY($1)`, with `guest?id=<id>` for each of the organization's `guest_accesses`.
  3. `DELETE FROM guest_accesses_versions WHERE version_source_id IN (SELECT id FROM guest_accesses WHERE organization_id = $1)`.
  4. `DELETE FROM guest_accesses WHERE organization_id = $1`.
  5. `DELETE FROM invitations_versions WHERE version_source_id IN (SELECT id FROM invitations WHERE organization_id = $1)`.
  6. `DELETE FROM invitations WHERE organization_id = $1`.
  7. `DELETE FROM organization_users_versions WHERE version_source_id IN (SELECT id FROM organization_users WHERE organization_id = $1)`.
  8. `DELETE FROM organization_users WHERE organization_id = $1`.
  9. `DELETE FROM organizations_versions WHERE version_source_id = $1`.
  10. `DELETE FROM organizations WHERE id = $1`.
- **Which users.** A user is due when the email ends in `@demo.invalid`, `inserted_at < now() - interval '24 hours'`, and the user owns no organization and has no `organization_users` row. The age rule protects a user whose demo is still being created: `Demo.start/0` creates the user seconds before the organization.
- **`delete_user(id)`**, in one transaction:
  1. `DELETE FROM users_versions WHERE version_source_id = $1 OR changed_by_id = $1`.
  2. `DELETE FROM user_identities WHERE user_id = $1`.
  3. `DELETE FROM tokens WHERE subject = $1`, with `user?id=<id>`.
  4. `DELETE FROM users WHERE id = $1`.
  If a kept organization still references the user (for example a `changed_by_id` row or an invitation the user sent before leaving it), the foreign key fails, the transaction rolls back, and the job logs `[DemoCleanup] Kept user <id>: still referenced by <constraint>.` and continues. It never rewrites another organization's audit rows.
- `Chironium.Workers.DemoCleanup`, an Oban worker:
  - returns `{:cancel, "Demo mode is off."}` unless `Demo.enabled?/0`, even if someone enqueues it by hand;
  - deletes each due organization in its own transaction, then each due user, so one failure doesn't stop the rest;
  - logs `[DemoCleanup] Deleted N organizations and M users.`
- `config/runtime.exs`: when demo mode is on, `config :chironium, Oban, plugins: [{Oban.Plugins.Cron, crontab: [{"0 * * * *", Chironium.Workers.DemoCleanup}]}]` (hourly, N8). AshOban appends its schedulers to this crontab (finding 5).

**Tests**
- A demo organization 25 hours old is deleted after the demo user has acted in it: updated the organization's settings, invited `someone@example.com`, and created a questionnaire link for a seeded patient. Its schema is gone (`information_schema.schemata`), and so is its user. Then, for every foreign key in the `public` schema whose target is `organizations` or `users` (read from `pg_constraint`), no row references the deleted organization or user. Reading the keys from the catalog keeps the test honest when a new table is added.
- A demo organization 1 hour old is kept.
- An organization with one non-demo member is kept, whatever its age.
- An organization owned by a non-demo user whose other members are all demo users is kept.
- An organization owned by a demo user with one non-demo member is kept.
- A demo user created 1 minute ago with no organization is kept; one created 25 hours ago with no organization is deleted.
- A demo user who still has version rows in a kept organization is kept, the job logs the reason, and the other due records are still deleted.
- With demo mode off, the job cancels and deletes nothing.
- Evaluating `runtime.exs` (with the Phase 1 setup) and passing the result through `AshOban.config/2`: with `DEMO_MODE=true`, the Cron crontab contains both `Chironium.Workers.DemoCleanup` and the `send_reminder` scheduler; without it, there is no `DemoCleanup` entry.

Commit: `feat(demo): delete demo organizations after 24 hours`

## Phase 5 — Docs and Changelog

- `docs/self-hosting.md`:
  - Optional table: `DEMO_MODE` ("Runs a public demo. Never set it on an instance with real data. Refuses to boot with email, Google, OpenID Connect or PostHog set."), `DATABASE_NAME` and `DATABASE_USERNAME`.
  - The `DATABASE_URL` row (line 80): without it, Chironium connects through `/var/run/postgresql` as `DATABASE_USERNAME` to `DATABASE_NAME`, both `chironium` by default.
- `deploy/.env.example`: commented-out `DEMO_MODE`, `DATABASE_NAME` and `DATABASE_USERNAME`, with one line each.
- `CHANGELOG.md` `[Unreleased]`, under Added: demo mode.

**Tests**
- None; documentation only.

Commit: `docs: document demo mode`

## Browser Cases

- D1 (email off): in demo mode, `/sign-in` shows "Try Chironium" and the "Try the demo" button, and no other sign-in method, in English and in Spanish.
- D2 (email off): clicking "Try the demo" leads to `/app`, which shows the demo banner and the seeded patients.
- D3 (email off): the banner shows on every app page and wraps cleanly at 375px.
- D4 (email off): two separate browser contexts each start a demo and get different organizations; neither sees the other's patients.
- D5 (email off): a questionnaire link created in the demo opens a portal page that shows the banner.
- D6 (email on): with demo mode off, `/sign-in` is unchanged and `POST /demo` returns 404.

## Red-Team Areas

- Cleanup scope: make the job delete an organization that has a non-demo member, or run with demo mode off. Try a demo user who invites a real address, and a real user who joins a demo organization. Start: `lib/chironium/demo/cleanup.ex`, `lib/chironium/workers/demo_cleanup.ex`.
- Abuse: flood `POST /demo` from one address and from spoofed `x-forwarded-for` values, push past the global cap, and look for other paths that create schemas. Start: `lib/chironium_web/controllers/demo_controller.ex`, `lib/chironium_web/plugs/portal_rate_limit.ex`, `lib/chironium/accounts/organization.ex`.
- Isolation and sessions: reach another demo organization by ID through GraphQL, and check that a visitor whose demo was deleted lands on the sign-in page instead of an error. Start: `lib/chironium/demo.ex`, `lib/chironium_web/router.ex`.
- Email and third parties: find any path that sends email or analytics in demo mode, including invitations, questionnaire links and reminders. Start: `lib/chironium/notifications.ex`, `config/runtime.exs`.

## Out of Scope

- Deploying a demo instance, and releasing a version that includes demo mode.
- A pool of pre-seeded organizations. Add it only if starting a demo is too slow.
- Analytics and a cookie consent banner. A demo instance runs without PostHog (N2).
- SNOMED: a demo instance should import LOINC only. That's a deployment choice; nothing in the code changes.

## Implementation Notes

Filled in by the implementing session.
