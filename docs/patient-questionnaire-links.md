# Patient Questionnaire Links — Implementation Plan

Planned 2026-09-24. Patients answer questionnaires through a single-use link. The link signs them in as their Patient identity until they submit. The design has to extend to persistent patient accounts, and to users who are both Patient and Practitioner.

## Decisions

- **Link:** single-use. It is valid for 7 days by default; a later due date extends it, up to 14 days. The link opens a "Continue" page, so sign-in is a POST and link previewers (WhatsApp, Outlook SafeLinks) can't use it up.
- **Session:** lasts until the response is submitted, the request is cancelled, or the access expires (the same `expires_at` as the link). There is no fixed short lifetime, so a patient can close the tab and come back on the same device. One questionnaire request gets exactly one patient session.
- **Why 14 days:** it matches the session cookie's `max_age` in `ChironiumWeb.Endpoint`, so a session never outlives its cookie silently.
- **Identity check:** none beyond having the link.
- **Answers:** extracted to Observations automatically and flagged as self-reported.
- **v1 channels:** copy/share link, plus an automatic email when the patient has an email address.

## Codebase Findings That Shape the Design

1. **19 policies use `authorize_if actor_present()`.** Any non-staff actor would pass them. Affected resources:
   - Health: Patient, Questionnaire (×2), QuestionnaireResponse, Task, Observation, Condition, Goal, AllergyIntolerance, MedicationRequest, MedicationStatement, NutritionPlan, and Practitioner (read).
   - CRM: Person.
   - Subscriptions: Subscription, SubscriptionPause, Plan.
   - Accounts: Organization (create), Invitation (accept/reject).

   A `%Patient{}` actor could call `createPatient`, or `createQuestionnaireResponse` / `createTask` for any subject.
2. **PaperTrail version resources have no authorizer.** They're readable through any source record the actor can read, for example `task { paperTrailVersions { changes } }`.
3. **ActorResolver ordering trap.** `Enum.group_by` returns a small map, and small maps iterate in key order: `:patient` < `:practitioner`. Registering a `:patient` resolver would silently turn every dual-role user into a Patient. `ActorResolver.resolve/2` is called by SetTenant and 7 test helpers.
4. **SetTenant needs `OrganizationUsers` membership.** Patients aren't members, so the portal needs its own actor resolution.
5. **The subject resource must be in the public schema.** AshAuthentication puts a `tenant` JWT claim on multitenant subject resources and checks it in `load_from_session`. That runs before SetTenant, so the tenant is still nil.
6. **`auth_routes` mounts every strategy phase,** including the magic-link *request* endpoint.
7. **Audit gaps.** `belongs_to_actor` covers only User and Practitioner. `QuestionnaireResponse.author` is Practitioner-only. `ExtractObservations` creates records without an actor.
8. **Where the token could leak:**
   - No `filter_parameters` is configured.
   - `PostHog.Integrations.Plug` records `$current_url` including the query string.
   - A LiveView join payload carries the full page URL, which `filter_parameters` cannot filter.
   - Oban job args are persisted in plain text.
   - The root layout loads PostHog and the full SPA.
9. **No rate limiting.** `AshRateLimiter` is listed on `User`, but the dependency was removed in `a6d90fb`. Spark drops it silently: it isn't loaded and isn't an extension.

## Architecture: Credential → Principal → Scope

| | Credential (how) | Principal (who) | Scope (what) |
|---|---|---|---|
| Staff (today) | `User` session | `User` (power user) or `%Practitioner{}` | care-team filters |
| **Link (v1)** | `GuestAccess` magic-link session | `%Patient{}` | `task_ids: [one task]` |
| Persistent patient (future) | `User` + `PrincipalGrant(:patient)` | `%Patient{}` | `nil` (all own tasks) |

- Policies are written against `%Patient{}` and scope metadata, never against the credential.
- The endpoint chooses the role:
  - `/gql` resolves staff principals only.
  - `/portal/gql` resolves patient principals only.
  - Rationale and alternatives, including a later move to a separate portal origin: see "One API endpoint per role" in `docs/design-decisions.md`.

## Phase 1 — Policy Hardening (No Feature; Ships Alone)

- Add `Chironium.Accounts.Checks.StaffActor` (SimpleCheck: `%User{}` or `%Practitioner{}`).
  - Replace all 19 `actor_present()` checks with it. Staff behaviour is unchanged; patients are excluded.
- Add `Chironium.Health.Checks.ActorIsPatient`.
- Put an authorizer on version resources in `Auditable`: `version_extensions authorizers: [Ash.Policy.Authorizer]`, plus a mixin that injects the policy `authorize_if StaffActor`.
- Make `ActorResolver.resolve/3` take a **required** `principal_types:` option.
  - SetTenant and all test helpers pass `[:practitioner]`.
  - With no default, registering `:patient` can never reintroduce the ordering trap.
- Add a **patient-actor matrix test**:
  - Covers every resource and action in `:ash_domains`, including version resources, with scoped and unscoped patient actors.
  - Asserts the action is forbidden or its filter is statically false, except for an explicit allowlist.
- Set `config :phoenix, :filter_parameters, ["password", "token", "secret"]`.
- Found while building the matrix test:
  - The Accounts resources (User, Organization, OrganizationUsers, Invitation and PrincipalGrant) get a `policy always()` staff gate. Their actor-relative filters, such as `id == ^actor(:id)` and `relates_to_actor_via`, aren't statically false for a Patient.
  - Terminology reads stay open: it's non-clinical reference data, and the matrix allowlists it. Its writes, previously `authorize_if always()` for any actor, now require StaffActor. Imports use `Repo.insert_all` and `Ash.Seed`, so they're unaffected.
  - `UserIdentity` stores OAuth tokens but had no authorizer. Now only AshAuthentication can reach it.

## Phase 2 — Data Model (FHIR SDC "complete-questionnaire" Task)

**Health.Task**
- New fields:
  - `code` (CodeableConcept, SDC `complete-questionnaire`)
  - `belongs_to :focus_questionnaire` (via `read_including_archived`)
  - `belongs_to :requester_practitioner`
  - `has_one :output_questionnaire_response`
- The new fields aren't writable, so they're excluded from `update: :*`.
- `field_policies` hide internal fields such as `note` from `ActorIsPatient`, with `:*` for the rest.
- `:request_questionnaire` (staff):
  - Inputs: patient, questionnaire, due date, message.
  - Validates that the questionnaire is active.
  - Reads the patient with the actor through `manage_relationship`, so only visible patients can be targeted.
  - Sets status `requested`, intent `order` and the requester from the actor.
  - Computes the access expiry: `max(now + 7 days, due date + 1 day)`, capped at `now + 14 days`.
  - The after_action issues the link-channel `GuestAccess` and returns the URL in action `metadata` (AshGraphql exposes it). It also enqueues the email-channel send.
- `:reissue_questionnaire_link` revokes every access for the task and issues new ones with a fresh expiry. `:cancel` revokes every access.
- State machine: allow `requested → in_progress/completed`.
- The reminder trigger explicitly excludes questionnaire tasks (`is_nil(focus_questionnaire_id)`).

**Health.QuestionnaireResponse**
- Add `belongs_to :task`.
- Add `belongs_to :author_patient`; at most one author may be set.
- Add a unique partial identity on `task_id`, so a double submit fails.
- `:submit_from_portal` (create, patient-only, accepts only `item`):
  - Forces `subject_id` = actor, `questionnaire_id` from the task, `task_id` from scope, `author_patient_id` = actor and `status: completed`.
  - Validates that the task is in scope and still open.
  - The after_action completes the Task and revokes the GuestAccess, which ends the session. It passes the patient actor, even with `authorize?: false`, so that `changed_by_patient` gets filled.
- `ExtractObservations` passes the context actor through for attribution.

**Observation:** add a `self_reported` calculation, `not is_nil(derived_from_response.author_patient_id)`. No migration is needed.

**Tenantable:** add `belongs_to_actor :changed_by_patient, Patient`. This means a codegen tenant migration on every `*_versions` table.

## Phase 3 — `Chironium.Accounts.GuestAccess` (Public Schema, AshAuthentication Subject `:guest`)

**Resource**
- Base: `Auditable`.
- Attributes:
  - `organization_id`, `principal_type` (`:patient`), `principal_id`, `task_id`
  - `channel` (`:link` | `:email`), with one record per delivery so the audit shows which one was used
  - `expires_at`, `claimed_at`, `revoked_at`
- **Lifetimes: `expires_at` is the real limit; the DSL lifetimes are only ceilings.**
  - AshAuthentication lifetimes are static, so both are set to the 14-day maximum: magic_link `token_lifetime {14, :days}` and `tokens.token_lifetime {14, :days}`.
  - Each request's actual window comes from its `expires_at`, enforced by the read filters below.
- Tokens: shared `Accounts.Token`, `store_all_tokens? true`, `require_token_presence_for_authentication? true`. Add a clause to `Chironium.Secrets`.
- Magic link strategy: `identity_field :id` (the primary key satisfies the verifier), `require_interaction? true`, `single_use_token? true`, `registration_enabled? false`.
- Actions:
  - `get_by_subject` filters `is_nil(revoked_at) and expires_at > now()`. Submitting, cancelling or expiry ends the session on the next request.
  - `sign_in_with_magic_link` applies the same filter and additionally requires `is_nil(claimed_at)`.
  - `:claim` sets `claimed_at` and revokes the sibling accesses for the same `task_id`. This is what guarantees one session per request.
  - `:issue` is internal only.
  - `:revoke` sets `revoked_at` and runs `revoke_all_stored_for_subject`.
- Policies:
  - The `AshAuthenticationInteraction` bypass covers only `get_by_subject` and `sign_in_with_magic_link`.
  - Everything else is forbidden, including the request action.
  - Not exposed in GraphQL.
- Add `Chironium.Health.PatientPrincipalResolver`. It loads the Patient with `guest_access` and `scope` metadata and is registered under `:patient`.

**Web wiring**
- `auth_routes AuthController, [User, GuestAccess]`.
- Confirm page: a **controller-rendered** `GET /portal/sign-in?token=…`, not `magic_sign_in_route`.
  - It avoids a LiveView socket, whose join payload would carry the token in its URL.
  - It renders a CSRF-protected form that POSTs to the strategy's sign-in route.
- `AuthController.success/failure`: branch on `{:guest, :magic_link, _}`.
  - Success: claim, store in session, redirect to `/portal` (no token in the URL).
  - Failure: `/portal/link-expired`.
- `:portal_graphql` pipeline:
  - Turns on `protect_from_forgery`.
  - Runs `load_from_session`, then `SetPortalActor`. The tenant comes from `GuestAccess.organization_id` and the header is ignored; with no guest session it returns 401.
  - Then SetLocale and AshGraphql.Plug.
- `/portal/gql` uses the same schema, but only with a hand-written `Absinthe.Plug.DocumentProvider.Compiled` module for 2–3 documents. **It is never routable with the Default provider.**
- Add `/portal/*path` before the staff catch-all. Add `/portal/sign-out`, which deletes only the guest session.
- Portal pages send `Referrer-Policy: no-referrer`. PostHog (plug and JS) is excluded from `/portal`.
- Rate limiting: a Hammer plug (by IP) on `/auth/guest/*`, `/portal/sign-in` and `/portal/gql`. Remove the dead `AshRateLimiter` reference, or re-add the dependency properly.

**v1 patient allowlist**

| Resource | Action | Condition |
|---|---|---|
| Task | read | `TaskVisibleToPatient`: own + questionnaire task + open status + `id in scope`; internal fields hidden by field policies |
| Questionnaire | read | `QuestionnaireVisibleToPatient`: `exists(tasks, …same…)` |
| QuestionnaireResponse | `submit_from_portal` | `ActorIsPatient` + in-action scope validation |
| (names) | — | `requester_name` / `organization_name` calculations on Task; Practitioner and Organization reads stay closed |

## Phase 4 — Email

- Add a `:questionnaire_requested` event and template.
  - Recipient: the email ContactPoint in `Person.telecom`.
  - Locale: the org's `preferred_locale`.
  - The email states the link's expiry date.
- The Oban job args hold only `guest_access_id` and the tenant.
- The worker checks that the access is still active and unclaimed, then **mints the token at send time**. The token never sits in `oban_jobs`, and a retried job can't send a link that was already revoked.

## Phase 5 — Patient Portal Frontend

- A separate Vite entry, `src/portal.tsx`, with a `portal_root` layout that loads only that entry. No UserStoreSync, org store, devtools or PostHog.
- A small code-based router under `/portal`: request → done → link-expired.
- Reuse `FillItems`, `fill-helpers`, `questionnaire-schemas`, shared UI and Paraglide.
- Add a visible "Sign out" action. Sessions now last days, so shared devices matter.
- Replace the hand-written server documents with gql.tada `graphql.persisted` plus a manifest from `gql.tada generate persisted` (both available in gql.tada 1.9.2 / cli-utils 1.7.3). The Compiled provider loads the manifest via `@external_resource`.
- The fetch client posts `{id, variables}` with the CSRF header.

## Phase 6 — Staff UI

- On patient detail, add a "Send questionnaire" dialog: questionnaire, due date and message.
  - The result offers copy, `navigator.share` (for WhatsApp) and an "email sent" note.
  - It shows the link's expiry date.
- The activity feed shows the questionnaire task status (including "link expired"), with Resend and Cancel.
- Show a self-reported badge on responses and observation cards.

## Testing

- **Matrix test** (Phase 1).
- **Field and relationship backstop:** loading `note` and `paper_trail_versions` on the patient's own Task as the patient returns nothing.
- **Scope tests:**
  - Patient A can't read B's task.
  - A scoped link can't see other tasks.
  - The staff `/gql` endpoint ignores guest sessions.
  - A spoofed tenant header is ignored.
- **Link tests:**
  - GET doesn't consume the link.
  - Reuse fails.
  - A sibling (email) link dies after the copy link is claimed.
  - A double submit is rejected.
- **Lifetime tests:**
  - An unopened link works days later, while it's before `expires_at`.
  - A session still works days after sign-in.
  - Both stop at `expires_at`, on submit and on cancel.
  - Expiry is never earlier than 7 days and never later than 14.
- **Practitioner tests:** can't request questionnaires for patients outside their care team; reissue revokes the old links.
- **Log capture at `:debug` across the whole flow:** the token appears in no log line and no PostHog event.
- **Audit:** `changed_by_patient` is set on the response and Task versions. Self-reported extraction is flagged.
- **Playwright end-to-end:** send → open → confirm → submit → staff sees the response and observations.

## Future: Persistent Patient Identities (No Rework Needed)

- The User has `PrincipalGrant(:patient)`, created by a "patient invitation" that doesn't add org membership.
- The portal also accepts `current_user` with patient grants, which yields the same `%Patient{}` actor with scope `nil`.
- Patient sign-in could use User magic-link by email, and later SMS OTP.
- `Ash.Scope` could be adopted, as the TODO in the GraphQL schema suggests.

## Pre-existing Issues (Follow-ups, Out of Scope)

1. Staff creates don't check patient visibility: any member can create a Task, QR or Observation for any patient ID in the tenant.
2. `/gql` has CSRF protection commented out, although the frontend already sends the token.
3. `GraphqlSocket.connect/3` accepts unauthenticated sockets.
4. The dead `AshRateLimiter` reference on `User`.
5. The Invitation `create` policy TODO.

## Implementation Notes

Where the build differs from the plan above:

- **Expiry lives on the Task too.** `Task.access_expires_at` copies the accesses' `expires_at`, so the staff UI can show the expiry and "link expired" without reading `GuestAccess`, which stays closed to every actor.
- **`submit_from_portal` takes a `task_id` argument.** It's checked against the session's scope, so the same action will serve unscoped persistent patients.
- **Claiming starts the task.** `QuestionnaireRequests.claim/2` moves a `requested` task to `in_progress`, so staff can see that the link was opened. Cancel now also works from `in_progress` and `on_hold`.
- **AshAuthentication's activity tuple is `{strategy, phase}`.** `AuthController` matches guests on `{:magic_link, _}` plus the `%GuestAccess{}` struct. Staff users have no magic link strategy.
- **The confirm page verifies the token without consuming it.** An invalid or used link goes to `/portal/link-expired`. A used link opened in the browser that holds its session continues to `/portal`.
- **`/portal/gql` is `post` only and needs a document `id`.** `RequirePersistedDocument` answers anything else with 400, and GET never reaches Absinthe. Portal pages are four explicit routes (`/portal`, `/done`, `/link-expired`, `/signed-out`), not a catch-all.
- **Rate limits** are keyed by the first `x-forwarded-for` hop, falling back to `remote_ip`. They are configurable under `ChironiumWeb.Plugs.PortalRateLimit`.
- **Persisted document IDs** are `sha256:` of `print(parse(document))`, matching gql.tada. A test re-hashes the manifest. `graphql.persisted` currently needs `@ts-expect-error`: graphql@16.13's `Kind` has `TYPE_COORDINATE`, which the `Kind` bundled with gql.tada lacks.
- **Hammer is pinned to 7.4.** 7.5 requires igniter 0.8, and the lockfile has 0.7.

## Assumptions

- An expired link shows "ask your practitioner for a new link". There is no self-service resend in v1.
- Answers aren't saved as a draft in v1. With multi-day sessions, a local draft keyed by task could be added later; it must be cleared on submit and on sign-out.
- Patient locale is the org locale, because Patient.communication isn't modelled.
- The name `GuestAccess` / `:guest` is open to change.
