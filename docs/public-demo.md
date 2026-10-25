# Public Demo Mode — Implementation Plan

Branch: `feat/demo-mode`

A demo mode for running a public Chironium demo. A visitor clicks "Try the demo", gets a private organization full of fake data, and explores the app. Demos older than 24 hours are deleted by a recurring cleanup job. Demo mode is off unless `DEMO_MODE` is set, and a normal instance never notices it.

## Goals

- A visitor can try Chironium in one click, without an account, email or password.
- Visitors never see each other's data, unless one of them shares an invite code on purpose (N10).
- Demo data, including anything real a visitor types by mistake, is gone within about 48 hours: kept for 24 hours, then deleted by the next cleanup run.
- Demo mode can never delete or expose anything on a normal instance.
- A demo instance never sends email or data to a third party.

## Decisions

1. **Switch:** `DEMO_MODE=true` turns demo mode on. A demo runs as its own instance with its own database and secrets. It refuses to boot with any email, external sign-in or analytics setting (N2).
2. **One organization per visitor.** The visitor owns it, so they can try everything, including settings and invitations. They can't create a second one (N3), and the app hides "Create organization" (N9).
3. **Sign-in:** only a "Try the demo" button. It creates a throwaway user `demo-<random>@demo.invalid` and signs them in by setting the session directly. `.invalid` is a reserved domain that can never receive email. Email, Google, OpenID Connect and the developer sign-in are hidden. A visitor who loses their cookie starts a new demo.
4. **Cleanup:** an hourly Oban cron job (N8) deletes organizations older than 24 hours whose owner and members are all demo users, including each organization's database schema, then deletes demo users older than 24 hours left without an organization.
5. **Banner:** every app page and every patient portal page (N6) shows "Demo: your data is deleted after 24 hours. Don't enter real client data." and a "Made by Sealambda" link to `https://sealambda.com`.
6. **Database settings:** without `DATABASE_URL`, production connects over the PostgreSQL Unix socket as user `chironium` to database `chironium`. Add `DATABASE_NAME` and `DATABASE_USERNAME`, both defaulting to `chironium`, so a demo can share a PostgreSQL server with another instance.
7. **Limits:** at most 200 live demos (N4, N12), and no per-IP limit (N5).

Answered before building (the phases below follow each answer):

- **N1. Scope:** this plan, as written, is the task.
- **N2. Boot refusal:** `DEMO_MODE` refuses to boot when `RESEND_API_KEY`, Google, OpenID Connect or `POSTHOG_API_KEY` is set, naming the variable. That one check in `runtime.exs` closes these paths, because each one is driven only by those variables:
  - email: `Notifications.email_enabled?/0` reads `email_enabled?`, which is true in production only with `RESEND_API_KEY`. `SendMagicLink`, `Notifications.send` and `NotificationEmailWorker` check it, and the Resend mailer adapter is configured only with that key;
  - Google and OpenID Connect: `:sign_in_providers` stays `nil` for both, so the sign-in page hides them, and `/auth/user/google` and `/auth/user/oidc` have no client secrets to start a flow with;
  - PostHog: `config :posthog, enable:` stays false, so the backend sends nothing and `Layouts.posthog_config/0` renders no `chironium:posthog-*` meta tags, so the SPA never loads PostHog.
- **N3. More organizations:** in demo mode, the `create` action on `Organization` is forbidden for every actor; `Demo.start/0` seeds with `authorize?: false`.
- **N4. Global cap:** at most 200 live demos. Past it, `POST /demo` redirects to `/sign-in` with "The demo is full right now. Please try again later."
- **N5. Per-IP limit:** none, changed after review. One IPv6 network has billions of addresses and a second proxy hides every visitor behind one address, so a per-IP limit is easy to get around and can lock everyone out. The 200 cap protects the server; the worst abuse is a demo that stays full until its demos turn 24 hours old.
- **N6. Banner:** the app shell and the patient portal layout, where a visitor is most likely to type real data.
- **N7. Failed start:** no wrapping transaction. On any error, `Demo.start/0` deletes what it created with the cleanup's delete functions, logs `[Demo] Start failed:` with the reason, and the controller redirects to `/sign-in` with "Couldn't start the demo. Please try again."
- **N8. Cleanup schedule:** hourly (`"0 * * * *"`). Oban Cron skips runs missed while the instance is down, so a daily run could break the 48-hour goal.

Answered with the recommended option (the user chose "go with all the recommended options"):

- **N9. Create organization in the app:** hidden in demo mode, in the organization selector (side nav and mobile side nav) and on the no-organization screen. Leaving them shown would end every click in a forbidden error.
- **N10. Join by invitation:** allowed. A visitor can create an invite code and accept another visitor's code, so they can try the invitation flow with a second browser. Joining is voluntary sharing, not a leak, and the cleanup rules already handle a demo user who belongs to another demo organization. The alternative, forbidding `accept` in demo mode and hiding "Join organization", would hide a feature decision 2 says the visitor can try.
- **N11. Over the per-IP limit:** no longer applies (N5).
- **N12. Cap race:** `Demo.start/0` counts demo users and creates the new one inside one short transaction that takes `pg_advisory_xact_lock`, so concurrent starts can't pass the cap. It counts users, not organizations, because the user is created first and each visitor has exactly one; counting organizations would leave a window of seconds while seeding runs. The lock covers only the count and one insert, not the seeding.
- **N13. Repeat and double starts:** a signed-in visitor never sees the button, because `/sign-in` already redirects signed-in users (`:live_no_user`). If a signed-in demo user who still belongs to an organization posts `/demo` anyway, the controller redirects to `/app` without starting another demo. The button disables itself after one click, so a double click starts one demo.
- **N14. A demo deleted mid-session:** a full page load of `/app` already goes to `/sign-in`, since `RequireAuthenticatedUser` finds no user. In the SPA, when demo mode is on and the organization list comes back empty or forbidden, the no-organization screen says "Your demo has ended." with a "Start a new demo" button that posts to `/demo`. Other screens keep their existing error states until the next navigation or reload. The alternative, making `/gql` answer 401 when the session's user no longer exists, would fix every stale session but changes a shared path for normal instances; it stays out of scope.
- **N15. Seeded content:** an organization named "Demo Clinic", owned by a user named "Demo user", with 15 patients and 3 practitioners. The organization and user keep the defaults `preferred_locale: "en"` and `timezone: "Etc/UTC"`: the locale only picks the language of emails, which a demo never sends, and the UI language follows the visitor's browser. The visitor can change the timezone in settings. Faker data is English in both languages.

## Codebase Findings That Shape the Design

1. **Seeding.** The same list of seed steps exists three times: `Chironium.Release.seed/1` (`lib/chironium/release.ex:73`), `Mix.Tasks.Chironium.Seed.run/1` (`lib/mix/tasks/chironium/seed.ex`), and soon `Demo.start/0`. `Seed.Organization.seed/1` creates its own user `seed-<n>@example.com`, defaults the slug to `seed-org-#{System.unique_integer([:positive])}`, and creates the organization with `generate(organization(actor: user, ...))`, which runs the domain's authorization. `Generator.organization` falls back to the sequence `org-N`. Both counters restart on every boot. Faker is a production dependency, so seeding works in the release.
2. **Signing in without a strategy.** `DevSignInController` and `PlaywrightE2EController` (`lib/chironium_web/controllers/playwright_e2e_controller.ex:60-71`) each mint a token with `AshAuthentication.Jwt.token_for_user/4`, put it in the user's metadata and call `store_in_session/2`. Both are mounted only with `:dev_routes`, which only `config/dev.exs` sets, so `mix test` never compiles their routes and no ExUnit test covers them; only Playwright (`assets/e2e`) uses them. The shared helper can't live in either.
3. **Organizations are database schemas.** `Organization` uses `manage_tenant` with the template `["org_", :id]` (`lib/chironium/accounts/organization.ex:17`). Creating one runs every tenant migration, which takes seconds. Destroying the record does **not** drop the schema. The slug must match `^[a-z0-9]+(-[a-z0-9]+)*$`.
4. **Foreign keys block deletion.** No foreign key into public `organizations` or `users` has an ON DELETE action (`priv/resource_snapshots/repo`). `Organization`, `OrganizationUser`, `Invitation`, `GuestAccess` and `User` use AshPaperTrail, so an Ash destroy writes a new version row pointing at the record being deleted. Every `*_versions` table has `changed_by_id → users` with `on_delete: :nothing`, and seeding with `actor: user` already writes such a row. Tenant tables (`principal_grants`, tenant `*_versions`) reference public `users` and `invitations`, so the schema must go first. `User` has no destroy action (`defaults [:read]` in `lib/chironium/accounts/user.ex`). `tokens` has no foreign key; rows are keyed by `subject`, such as `user?id=<id>` and `guest?id=<id>`. Cleanup therefore uses SQL in a fixed order, not Ash destroys.
5. **Oban cron.** `config/config.exs:30` sets the Oban `queues`, `repo` and `plugins: [{Oban.Plugins.Cron, []}]`, and `AshOban.config/2` (`lib/chironium/application.ex`) appends its schedulers, such as the hourly `send_reminder`, to that plugin's `crontab` (`put_crontab` in `deps/ash_oban/lib/ash_oban.ex`). A crontab set in `runtime.exs` is extended, not replaced; Phase 4 tests this.
6. **Rate limiting.** The demo adds no per-IP limit (N5); `PortalRateLimit` is unchanged.
7. **Sign-in page.** `ChironiumWeb.SignInLive` shows each configured method from `:sign_in_providers` and `Notifications.email_enabled?/0`. Its elements are `sign-in-heading`, `sign-in-google-link`, `sign-in-oidc-link`, `sign-in-email-form`, `sign-in-link-form` and `dev-sign-in-form`. The developer form is compiled in only with `:dev_routes`, so no ExUnit test can see it either way. In demo mode the page shows only the demo button.
8. **Production boot check.** `config/runtime.exs` refuses to boot in production with no sign-in method. Demo mode must count as a method. Evaluating the file with `env: :prod` also needs `SECRET_KEY_BASE` and `TOKEN_SIGNING_SECRET`, and calls `PhoenixVite.cache_static_manifest_latest/1`, which parses `priv/static/.vite/manifest.json`; a test run may not have that file (commit d908f41).
9. **SPA flags.** The root layout passes deployment settings to the React app as `chironium:*` meta tags. The newer ones are read through `runtimeConfig` in `assets/src/shared/utils/runtime-config.ts`, as the layout's comment says; `chironium:email-enabled` still has its own `email-enabled.ts`. `chironium:demo` follows the newer pattern.
10. **Organization entry points in the SPA.** "Create organization" appears in `OrgSelector` (rendered by `SideNav` and `MobileSideNav` in `shared/layout/side-nav.tsx`) and in `NoOrgScreen` (`routes/_app.tsx`), which opens `CreateOrgModal`. "Join organization" opens `PendingInvitationsDialog`, which accepts an invite code.
11. **Stale sessions.** `requestGraphql` (`shared/api/graphql.ts`) redirects to `/sign-in` only on a 401 or an "unauthorized"/"unauthenticated" error. The staff `/gql` pipeline answers a request whose user no longer exists as an anonymous one, so the SPA sees empty or forbidden results, not a 401.

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
- `DEMO_MODE=true` raises and names the variable for each of the four refusals: `RESEND_API_KEY`; `GOOGLE_CLIENT_ID` with `GOOGLE_CLIENT_SECRET`; `OIDC_ISSUER`, `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET`; `POSTHOG_API_KEY`.
- The socket branch uses `DATABASE_NAME` and `DATABASE_USERNAME` when set, and `chironium` for both without them.

Commit: `feat(demo): add a demo mode switch`

## Phase 2 — Start a Demo

- **Shared seeding.** Add `Mix.Tasks.Chironium.Seed.All.seed(tenant, opts)` in `lib/mix/tasks/chironium/seed/all.ex`. It runs the steps from practitioners through clinical notes, takes `patients:`, `practitioners:` and a `log:` function, and returns the practitioners and patients. Its three callers:
  - `Release.seed/1`, with `log: &IO.puts/1`;
  - `Mix.Tasks.Chironium.Seed.run/1`, with `log: &Helpers.info/1`;
  - `Demo.start/0`, with a no-op `log`.
  The invitation stays out of the shared function: `Release.seed/1` and the mix task keep calling `Organization.seed_invitation/4` themselves, and a demo creates no invitation.
- `Seed.Organization.seed/1`: accept `user:` and use it instead of creating one, and accept `authorize?:` and pass it to `generate(organization(actor: user, authorize?: ..., ...))` (`authorize?` is one of the generator's Ash options). Without it, the N3 policy forbids the demo's own organization. The existing `name:` and `slug:` options stay.
- **Token.** `Demo.start/0` generates one token with `:crypto.strong_rand_bytes(10) |> Base.encode32(case: :lower, padding: false)`: 16 characters from `[a-z2-7]`, so it always fits the slug constraint (finding 3), unlike base64url, whose `_` and `-` would fail some starts at random. It uses the token for both the email `demo-<token>@demo.invalid` and the slug `demo-<token>`, passed explicitly, so the `seed-<n>` and `org-N` counters are never reached.
- `Chironium.Demo.start/0`:
  1. in one transaction: `SELECT pg_advisory_xact_lock(<constant key>)`, count users whose email ends in `@demo.invalid`, return `{:error, :full}` if the count has reached `max_demos` (N4, N12), otherwise create the user "Demo user" with `Ash.Seed`;
  2. seeds an organization named "Demo Clinic" with the slug above, owned by that user, through `Seed.Organization.seed(user: user, name: ..., slug: ..., authorize?: false)` (N3);
  3. calls the `seed` setting, which defaults to `&Seed.All.seed/2`, with 15 patients and 3 practitioners. Tests replace it to inject a failure;
  4. returns `{:ok, user}`. On any error or raise after step 1 it deletes the user and organization it created with `Chironium.Demo.Cleanup.delete_organization/1` and `delete_user/1` from Phase 4, logs `[Demo] Start failed:` with the reason, and returns `{:error, reason}` (N7). Phase 2 builds those two functions early, since Phase 4 reuses them.
- Settings live in `config :chironium, Chironium.Demo` with defaults in the module: `max_demos: 200` and `seed: &Seed.All.seed/2`.
- **Shared sign-in.** Add `ChironiumWeb.SessionSignIn.sign_in(conn, user)` in `lib/chironium_web/session_sign_in.ex`. It mints the token, puts it in the user's metadata and calls `store_in_session/2`, returning `{:ok, conn}` or `:error`. `DevSignInController`, `PlaywrightE2EController` and `DemoController` call it. `PlaywrightE2EController` keeps its own `delete_session(:auth_return_state)` and its 500 on `:error`.
- **Route.** `post "/demo", DemoController, :create` in the public `scope "/", ChironiumWeb` with `pipe_through :browser` (the one that mounts `/sign-in`), so it gets the session and CSRF protection, and outside `:require_authenticated_user`. Routes compile before runtime config, so a plug in the controller checks `Demo.enabled?/0` and returns 404 when demo mode is off.
- `ChironiumWeb.DemoController.create/2`, in this order:
  1. a signed-in demo user who still belongs to an organization is redirected to `/app` without starting a demo (N13);
  2. `Demo.start/0`, sign-in through `SessionSignIn`, and a redirect to `/app`. On `{:error, :full}` or any other error it redirects to `/sign-in` with the matching message from N4 or N7.
- `Organization` `create` policy: `forbid_if Chironium.Demo.Checks.DemoMode` before the `StaffActor` check (N3).
- After moving both dev controllers onto `SessionSignIn`, run the Playwright suite (`pnpm assets:e2e`), which is the only thing that exercises them (finding 2), and record the result in the Implementation Notes.
- Measure how long `Demo.start/0` takes and record it in the Implementation Notes. If it's over 10 seconds, add a follow-up for a pool of pre-seeded organizations.

**Tests**
- `:demo_mode?` is global application env, and the N3 policy affects every organization create, including `generate(organization(...))` in unrelated tests. Every test module that turns demo mode on is `async: false`, as `PageControllerTest` already is for the email flag, sets it with `Application.put_env/3` and restores it in `on_exit`. That covers the `DemoController` tests, the N3 GraphQL test, the isolation test, the `SignInLive` and page meta tag tests, the portal banner test and the cleanup worker tests. ExUnit runs `async: false` modules after the async ones, so no async test sees demo mode on.
- `POST /demo` with demo mode on creates a `@demo.invalid` user named "Demo user" who owns exactly one organization named "Demo Clinic" with 15 patients, signs them in, and redirects to `/app`. The slug is `"demo-" <> token` and the email `"demo-#{token}@demo.invalid"` for the same token, the token matches `^[a-z2-7]{16}$`, and the start creates exactly one user (no `seed-*@example.com` user). This checks the rule: every value Demo.start writes to a public unique column comes from the random token, not from a counter.
- With demo mode off, `POST /demo` returns 404.
- A signed-in demo user who owns an organization posts `/demo` and is redirected to `/app`; no user or organization is created.
- With `max_demos: 2` and two demo users already present, `POST /demo` redirects to `/sign-in` with the "demo is full" message and creates nothing.
- With the `seed` setting replaced (through `Application.put_env/3`, restored in `on_exit`) by a function that raises a `RuntimeError`, which runs after the organization exists, `POST /demo` redirects to `/sign-in` with the N7 message, and no user, organization or `org_<id>` schema is left. The injected failure is an Elixir raise, not a failing SQL statement: inside the Ecto sandbox, a failed statement outside a savepoint aborts the test's transaction, and the cleanup queries would then fail for a reason production never hits.
- In demo mode, `createOrganization` through GraphQL as a demo user returns a forbidden error and creates no schema. With demo mode off, the same mutation still works.
- Isolation: two demo starts, A and B. As A, `listOrganizations` returns only A's organization, `getOrganization` with B's ID returns no organization, and a patient query with B's tenant in `x-chironium-organizationid` returns no B patients.
- `mix chironium.seed` and `Release.seed/1` still create an organization, its data and an invitation.

Commit: `feat(demo): start a private demo organization in one click`

## Phase 3 — Sign-In Page, Banner and App Entry Points

- `SignInLive`: in demo mode, show only a heading ("Try Chironium"), one sentence ("Explore a private demo clinic with fake data. No account needed."), a "Try the demo" button (`data-testid="sign-in-demo-button"`) that posts to `/demo`, and the note "Your demo is deleted after 24 hours." Hide every other sign-in method, including the developer form. Show the flash from a failed, full or rate-limited demo. The form uses `phx-submit` with `phx-trigger-action`, so `phx-disable-with` disables the button after one click (N13).
- Root layout: `<meta name="chironium:demo" content="true">` when demo mode is on, next to the other runtime settings. Add `demo: readMeta("chironium:demo") === "true"` to `runtimeConfig` (finding 9); `email-enabled.ts` stays as it is.
- `DemoBanner` component at the top of the app shell, with the text from decision 5. Follow AGENTS.md: one responsive component, standard Tailwind tokens only.
- When `runtimeConfig.demo` is true (N9, N14):
  - `OrgSelector` hides its "Create organization" item, in both `SideNav` and `MobileSideNav`;
  - `NoOrgScreen` shows "Your demo has ended." with a "Start a new demo" button that posts to `/demo` with the page's CSRF token, instead of "Create organization". It has no "Join organization": the cleanup deleted the visitor's user, so accepting a code would fail. A visitor whose demo is still live can join from the organization selector (N10).
- Portal layout (`portal_root.html.heex`): the same banner text when demo mode is on (N6).
- Translations: Gettext for the sign-in page, the flash messages and the portal banner, Paraglide for the app banner and the demo-ended screen, in English and Spanish.

**Tests**
- Sign-in page in demo mode, with Google and OpenID Connect turned on through `:sign_in_providers` and email on (as always in test): the demo button shows, and `sign-in-google-link`, `sign-in-oidc-link` and `sign-in-email-form` don't. Each is checked by its exact `data-testid`, not a `sign-in-*` prefix, which would also match `sign-in-heading`. With demo mode off and the same settings, all three show, so the test proves demo mode hides them. The developer form (`dev-sign-in-form`) isn't compiled in tests (finding 7); browser case D1 covers it.
- The page controller test sees the `chironium:demo` meta tag when demo mode is on, and doesn't see it when it's off.
- A portal page shows the banner in demo mode and not otherwise.
- Vitest, with `runtimeConfig` mocked: the banner renders only when `demo` is true; the organization selector and `NoOrgScreen` show "Create organization" only when it is false; in demo mode `NoOrgScreen` shows "Your demo has ended." and the "Start a new demo" button.

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
  1. `DELETE FROM users_versions WHERE version_source_id = $1`. Only the user's own history: a version row of another user that this user changed is not this user's to delete, and its foreign key keeps the user instead (below).
  2. `DELETE FROM user_identities WHERE user_id = $1`.
  3. `DELETE FROM tokens WHERE subject = $1`, with `user?id=<id>`.
  4. `DELETE FROM users WHERE id = $1`.
  If anything kept still references the user (a `changed_by_id` row in a kept organization or another user's history, or an invitation the user sent before leaving), the foreign key fails, the transaction rolls back, and the job logs `[DemoCleanup] Kept user <id>: still referenced by <constraint>.` and continues. It never rewrites or deletes another organization's or user's audit rows.
- `Chironium.Workers.DemoCleanup`, an Oban worker:
  - returns `{:cancel, "Demo mode is off."}` unless `Demo.enabled?/0`, even if someone enqueues it by hand;
  - deletes each due organization in its own transaction, then each due user, so one failure doesn't stop the rest;
  - logs `[DemoCleanup] Deleted N organizations and M users.`
- `config/runtime.exs`: when demo mode is on, `config :chironium, Oban, plugins: [{Oban.Plugins.Cron, crontab: [{"0 * * * *", Chironium.Workers.DemoCleanup}]}]` (hourly, N8). AshOban appends its schedulers to this crontab (finding 5).

**Tests** (`async: false`, since they turn demo mode on)
- A demo organization 25 hours old is deleted after the demo user has acted in it: updated the organization's settings, invited `someone@example.com`, and created a questionnaire link for a seeded patient. Its schema is gone (`information_schema.schemata`), and so is its user. Then, for every foreign key in the `public` schema whose target is `organizations` or `users` (read from `pg_constraint`), no row references the deleted organization or user. Reading the keys from the catalog keeps the test honest when a new table is added.
- A demo organization 1 hour old is kept.
- An organization with one non-demo member is kept, whatever its age.
- An organization owned by a non-demo user whose other members are all demo users is kept.
- An organization owned by a demo user with one non-demo member is kept.
- A demo user created 1 minute ago with no organization is kept; one created 25 hours ago with no organization is deleted.
- A demo user who still has version rows in a kept organization is kept, the job logs the reason, and the other due records are still deleted.
- Joined by invitation (N10): demo user B joined demo organization A by invite code. When A is due and B's own organization is not, A is deleted and B and B's organization stay. When B's organization is due and A is not, B's organization is deleted and B stays while still a member of A.
- With demo mode off, the job cancels and deletes nothing.
- A visitor whose demo was deleted: sign in through `POST /demo`, age the organization and user to 25 hours, run the job, then `GET /app` with the same session redirects to `/sign-in`, and `POST /demo` with that session starts a new demo.
- Crontab: evaluate `runtime.exs` (with the Phase 1 setup), merge the result into the test environment's current Oban config with `Config.Reader.merge/2` (`Application.get_all_env(:chironium)` holds `queues` and `repo` from `config/config.exs`; `runtime.exs` sets only `plugins`), and pass the merged `Oban` config to `AshOban.config/2`. Without the merge, AshOban's `require_queues!` fails for the `send_reminder` trigger. With `DEMO_MODE=true`, the Cron crontab contains both `Chironium.Workers.DemoCleanup` and the `send_reminder` scheduler; without it, there is no `DemoCleanup` entry.

Commit: `feat(demo): delete demo organizations after 24 hours`

## Phase 5 — Docs and Changelog

- `docs/self-hosting.md`:
  - Optional table: `DEMO_MODE` ("Runs a public demo. Never set it on an instance with real data. Refuses to boot with email, Google, OpenID Connect or PostHog set."), `DATABASE_NAME` and `DATABASE_USERNAME`.
  - The `DATABASE_URL` row (line 80): without it, Chironium connects through `/var/run/postgresql` as `DATABASE_USERNAME` to `DATABASE_NAME`, both `chironium` by default.
- `deploy/.env.example`: a commented-out `DEMO_MODE` with one line. `DATABASE_NAME` and `DATABASE_USERNAME` stay out: `deploy/compose.yaml` always sets `DATABASE_URL`, so they would have no effect there.
- `CHANGELOG.md` `[Unreleased]`, under Added: demo mode.

**Tests**
- None; documentation only. The settings it documents are tested in Phase 1 (`DATABASE_NAME`, `DATABASE_USERNAME`, `DEMO_MODE`) and Phase 4 (the crontab), both through `runtime.exs` evaluation with the Phase 1 setup.

Commit: `docs: document demo mode`

## Browser Cases

- D1 (email off): in demo mode, `/sign-in` shows "Try Chironium" and the "Try the demo" button, and no other sign-in method, including the developer form, in English and in Spanish.
- D2 (email off): clicking "Try the demo" leads to `/app`, which shows the demo banner and the seeded patients. The side nav has no "Create organization".
- D3 (email off): the banner shows on every app page and wraps cleanly at 375px.
- D4 (email off): two separate browser contexts each start a demo and get different organizations; neither sees the other's patients.
- D5 (email off): a questionnaire link created in the demo opens a portal page that shows the banner.
- D6 (email on): with demo mode off, `/sign-in` is unchanged, the side nav still offers "Create organization", and `POST /demo` returns 404.

## Red-Team Areas

- Cleanup scope: make the job delete an organization that has a non-demo member, or run with demo mode off. Try a demo user who invites a real address, and a real user who joins a demo organization. Start: `lib/chironium/demo/cleanup.ex`, `lib/chironium/workers/demo_cleanup.ex`.
- Abuse: push past the global cap with concurrent starts, and look for other paths that create schemas. Start: `lib/chironium_web/controllers/demo_controller.ex`, `lib/chironium/demo.ex`, `lib/chironium/accounts/organization.ex`.
- Isolation and sessions: reach another demo organization by ID through GraphQL, and check what a visitor whose demo was deleted sees mid-session. Start: `lib/chironium/demo.ex`, `lib/chironium_web/router.ex`.
- Email and third parties: find any path that sends email or analytics in demo mode beyond those listed under N2, including invitations, questionnaire links and reminders. Start: `lib/chironium/notifications.ex`, `config/runtime.exs`.

## Out of Scope

- Deploying a demo instance, and releasing a version that includes demo mode.
- A pool of pre-seeded organizations. Add it only if starting a demo is too slow.
- Analytics and a cookie consent banner. A demo instance runs without PostHog (N2).
- SNOMED: a demo instance should import LOINC only. That's a deployment choice; nothing in the code changes.
- A 401 from `/gql` for sessions whose user no longer exists (N14).

## Implementation Notes

Filled in by the implementing session.

### Phase 1

- The N2 refusal raises once and names every variable that is set, joined with commas: `DEMO_MODE is set, so GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET must be unset. ...`. It checks the variables themselves (`RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `POSTHOG_API_KEY`), not whether a provider ended up configured; a partial Google or OpenID Connect setup still fails earlier with its own message. `GOOGLE_REDIRECT_URI` and `OIDC_DISPLAY_NAME` alone turn nothing on, so they are allowed.
- An empty `DATABASE_NAME` or `DATABASE_USERNAME` counts as unset and falls back to `chironium`, as an empty `DATABASE_URL` already does.
- The runtime test also clears `GOOGLE_REDIRECT_URI` and `OIDC_DISPLAY_NAME`, and its manifest stub creates `priv/static/.vite/` when missing (it removes only the file). Its eight cases fail when the demo rules are removed from `runtime.exs`; the full ExUnit suite passes (486 tests).

### Phase 2

- `Seed.All.seed/2` returns `{practitioners, patients}`. `Seed.Organization.seed/1` takes `user:` lazily, so the mix task and `Release.seed/1` still create their own `seed-<n>@example.com` user.
- On a failed start, `Demo.start/0` finds the organization by its slug before deleting it, because a raise inside `Seed.Organization.seed/1` loses the record. Seeding is caught with `catch kind, reason`, so exits and throws clean up too.
- `Cleanup.delete_user/1` returns `{:error, constraint}` after rolling back when a foreign key still references the user. Logging `[DemoCleanup] Kept user ...` is left to the Phase 4 worker.
- `Chironium.Demo` also has `config/1` (settings merged over the defaults) and `demo_user?/1`. The controller's repeat-start check (N13) uses `Ash.exists?(Organization, actor: user)`, which covers owned and joined organizations.
- With demo mode off, `POST /demo` answers a plain-text `404 Not Found`.
- The three flash messages use `gettext`; their Spanish translations come with the Phase 3 Gettext work.
- If `SessionSignIn.sign_in/2` fails after a successful start, the visitor gets the N7 message and the orphaned demo waits for the cleanup job.
- `POST /demo` takes about 1.4 seconds in the test sandbox (15 patients, 3 practitioners), so no pre-seeded pool is needed.
- The Playwright suite was not run in this phase: the workflow runs it once all phases are built (gate 2). It is still the only check of `DevSignInController` and `PlaywrightE2EController` after their move to `SessionSignIn`.
- Tests: `test/chironium_web/controllers/demo_controller_test.exs` (`async: false`, `@moduletag :capture_log` because seeding logs skipped BMI warnings) and `test/mix/tasks/chironium_seed_test.exs`. The N3 test fails when the `forbid_if` is removed. The full ExUnit suite passes (498 tests).
- `mix ash.codegen --check` reports pending GraphQL schema generation on the base commit too; the Phase 2 policy change adds nothing to it.

### Phase 3

- In demo mode `SignInLive` shows only the demo form on both `/sign-in` and `/sign-in/link`. The button shows "Starting the demo..." while disabled. Without a LiveView connection the form still posts normally, since `phx-submit` only applies once connected.
- The app banner sits at the top of the page content, inside `AppShell`'s `<main>`, not above the fixed top bar: putting it above would mean shifting the fixed header, side nav and content offsets. It scrolls with the page.
- The portal banner is rendered in `portal_root.html.heex` above `{@inner_content}`, so it shows on the server-rendered confirm page and on the portal SPA. The SPA page loads only the Vite CSS, so `assets/src/styles/index.css` adds an `@source` for that one template. Both banners use standard Tailwind amber colors, which exist in both CSS builds and read in light and dark themes.
- `NoOrgScreen` moved from `routes/_app.tsx` to `features/org/ui/no-org-screen.tsx` so Vitest can import it. "Start a new demo" builds and submits a form with `_csrf_token`, using `getCsrfToken`, now exported from `shared/utils/request-utils.ts`. The demo-ended screen offers only "Start a new demo" and has no description.
- Tests turn demo mode on with `Chironium.DataCase.enable_demo_mode/0`, next to `disable_email/0`. The sign-in tests also follow the form's `phx-trigger-action` to `POST /demo`, and check that a refused start's flash shows on the demo sign-in page.
- `mix gettext.extract --merge` also rewrites unrelated, already stale entries in `en/default.po`, `emails.pot` and `es/emails.po`, and creates `en/emails.po`; those changes were reverted, keeping only `default.pot` and `es/default.po`.
- No Playwright spec was added: this phase lists none, and browser cases D1 to D3 cover it.

### Phase 4

- The age rule compares `inserted_at` with `now() AT TIME ZONE 'utc'`, not `now()`: timestamps are stored in UTC without a zone, so a plain `now()` would shift the 24 hours by the server's time zone (the local test database runs on `Europe/Zurich`).
- The worker runs on the `default` queue with Oban's default retries. A `delete_organization/1` that raises is rescued and logged as `[DemoCleanup] Kept organization <id>: <message>`, so one organization can't block the rest; no known input makes it fail, so that branch has no test. `Kept user` is a warning, the summary line is info.
- The "acted in it" test creates the questionnaire it sends, since `Seed.All` seeds none, and sends it as the owner resolved the way `SetTenant` does. Of the two "one non-demo member" cases, one adds that member next to a demo member in a year-old organization, the other has only that member at 25 hours.
- Tests: `test/chironium/workers/demo_cleanup_test.exs` (11 cases) and two crontab cases in `test/chironium/config/runtime_test.exs`. Removing the non-demo-member rule, the owner rule or the user age rule each fails its test. The full ExUnit suite passes (516 tests). No Playwright spec: this phase lists none.

### Phase 5

- `DATABASE_NAME` and `DATABASE_USERNAME` went into the self-hosting guide's Database table, next to `DATABASE_URL`, not the Optional table: that is where a reader looks for database settings. `DEMO_MODE` is in the Optional table, and the Sign-in section notes that demo mode is the one exception to "refuses to start with none".
- The `DEMO_MODE` row and the changelog entry also say what demo mode does (one-click sign-in, deletion after 24 hours), so an operator reading only that row knows it deletes data.
- `deploy/.env.example` adds `# DEMO_MODE=true` after the sign-in variables, telling the reader to leave them empty. Empty values count as unset for the boot refusal, so the file's blank `RESEND_API_KEY=` and friends don't block a demo.
