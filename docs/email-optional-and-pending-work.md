# Email-Optional Workflows and Pending Work — Implementation Plan

Planned 2026-10-19, revised 2026-10-20. Chironium must work fully without an email provider. Practitioners send questionnaires and invitations as links they share themselves, and the app tells them, in the web interface, when a patient hasn't answered in time.

This plan builds on #189 (patient questionnaire links, this branch), which adds `QuestionnaireRequests`, `GuestAccess`, `Task.access_expires_at` and the Send questionnaire dialog. It doesn't depend on any other PR.

## Goals

1. **Email is optional.** With no email provider configured, nothing tries to send email, and every flow still works through links.
2. **Invitations work without email.** The inviter sees the link and code and shares them. Invite codes expire and can be renewed.
3. **Overdue alerts.** The activity feed shows overdue questionnaires. A new Pending page lists everything that needs attention across all patients, with a counter in the side menu.
4. **Task reminder emails send once.** Today an open task gets up to about 24 reminder emails, and the link in them is broken.

## Decisions

1. **Overdue rule:** a questionnaire request is overdue when its due date has passed without an answer. A request without a due date is never overdue; when its link expires, it shows "Link expired".
2. **Pending page contents:** overdue questionnaires, questionnaires whose link expired, and due reminders. A request whose link expired still needs the practitioner to act (resend or cancel), so it is listed too, with its "Link expired" badge.
3. **Pending page counter:** the menu item shows one combined count of everything on the page.
4. **Pending page:** a normal page, not an overlay, following the "Inline over Overlay" pattern in `AGENTS.md`.
5. **Due reminder:** a reminder appears on the Pending page when its date arrives, in the practitioner's local time, and leaves when it is done or cancelled.
6. **Email switch:** one server-side flag, `Chironium.Notifications.email_enabled?/0`. Every email goes through `Notifications.send/2`, so the guard lives there once.
   - **Production and development:** on only when `RESEND_API_KEY` is set. No new variable.
   - **Development:** the mailer stays on the Swoosh mailbox at `/dev/mailbox` whatever the key is, so a dummy value such as `RESEND_API_KEY=dev` turns email on and nothing leaves the machine. Removing it lets a developer try the email-off flows.
   - **Test:** always on, so the suite doesn't depend on a local env file. Tests that need email off set the flag themselves.
7. **Phase order:** the reminder fix ships right after the email switch, because it is a live bug that spams the care team.
8. **Old invitations:** enforcing expiry stops every pending invitation older than 7 days, which is accepted. A `NULL` `expires_at` counts as expired.
9. **Resending an overdue request:** reissuing a link keeps the due date, so a request with a due date stays overdue until it is answered or cancelled. Submitting completes the task, which removes it from the Pending page and shows "Completed" in the feed.
10. **Manager invitations are bound to their email.** Anyone can accept a Member invitation link, but only a signed-in user whose email matches the invitation can accept or reject a Manager one. A manager sees every patient in the organization, so a leaked Manager link must not grant that.
11. **Renewing an expired invitation:** admins get a "Renew" action on expired invitations. It keeps the same invitation, with its email, role and practitioner grant, and gives it a new code and a new 7-day expiry.
12. **Dates follow the practitioner's timezone.** The browser turns a picked date into an exact instant, as reminders already do. The questionnaire due date is changed to work the same way (Phase 4).
13. **Reminders with email off:** the trigger still marks each reminder as sent. Turning email on later doesn't send reminders that were already marked; they're on the Pending page anyway.
14. **"Mark as done" is one step:** `:complete` also accepts `:ready` and `:accepted`, so a reminder completes in one mutation.

## Codebase Findings That Shape the Design

1. **Production without `RESEND_API_KEY` doesn't skip email; it fails.** `config/config.exs` sets `Swoosh.Adapters.Local`, and `config/prod.exs` sets `config :swoosh, local: false`, so the in-memory mailbox the Local adapter writes to is never started. Each `NotificationEmailWorker` job crashes in `Swoosh.Adapters.Local.Storage.Memory.push/1` and Oban retries it.
2. **The Send questionnaire dialog has no email option.** Email is automatic when the patient's `Person.telecom` has an address (`QuestionnaireRequests.issue_links/2`). The dialog only shows an "emailed" note when `metadata.emailSent` is true. "Hide the email option" therefore means: with email off, issue no email `GuestAccess` and return `emailSent: false`. No dialog change is needed.
3. **The reminder email link is wrong in two ways.** `SendTaskReminder` builds `#{Endpoint.url()}/tasks/#{task.id}`. The SPA is mounted under `/app` (`assets/src/app/router.ts`, `basepath: "/app"`), and the patient page's `$customerId` parameter is the **Person** id, not the Patient id (`person-detail-page.tsx` calls `usePersonDetail(customerId)`). The correct link is `/app/customers/<patient.person_id>`, not `/customers/<patientId>` as the requirements said.
4. **Reminder repeats.** `tasks_needing_reminder` selects `status in [:ready, :accepted]` with `requested_period.start` in `[now, now + 24h]` (`FilterByRequestedPeriodWindow`). Nothing marks a task as reminded, so the hourly trigger picks it up on every run inside that window. The existing trigger tests create tasks with `for_patient_id: nil`, so they never send an email and couldn't catch this.
5. **A reminder stamp would pollute the activity feed.** The feed reads `paperTrailVersions(limit: 1)` for each task's "last changed by" and time (`activity-feed-normalizers.ts`). An `update :send_reminder` that sets a column creates a version with no actor. AshPaperTrail's `ignore_actions` option avoids this.
6. **Invitations already carry everything a link needs.**
   - `Invitation.invite_code` is public and in the GraphQL schema; `invitation_accept_url/1` (private, `invitation.ex`) builds `/app?inviteCode=…`.
   - `RequireAuthenticatedUser` stores the full URL, including the query string, in a signed return-state token, so a signed-out invitee lands back on `/app?inviteCode=…` after sign-in. That token lasts 10 minutes (`AuthReturnState`).
   - `_app.tsx` reads `inviteCode` from the URL and opens `PendingInvitationsDialog` with it.
   - Accepting checks only `StaffActor`, not the invitee's email. The test "can accept an invitation with a different email address" (`accounts_test.exs`) relies on this.
7. **The invite mutation doesn't return the invitation.** `inviteUsersToOrganization` is an `update` on Organization (`:invite_users`, `manage_relationship(:invitations, type: :create)`), so its `result` is the Organization. The new invitation is reachable as `result.invitations`, filtered by email.
8. **Every member can read invite codes today.** The Invitation read policy allows `accessing_from(Organization, :invitations)`, so any member who reads their organization can select `invitations { inviteCode }`. The frontend doesn't, but the schema allows it.
9. **`Invitation.expires_at` is nullable in the database** (`20260324092401_invitations.exs`), and nothing reads it. Rows created before the column had a default may be `NULL`.
10. **An expired pending invitation blocks re-inviting the same email.** The `unique_invitation` identity is `[:organization_id, :email]`, partial on `archived_at IS NULL`. Renewing (decision 11) or revoking resolves it.
11. **`tasksListQueryKey(organizationId)` is invalidated everywhere and queried nowhere.** Every task mutation already invalidates it (`person-detail-cache.ts`, `add-task-reminder-dialog.tsx`, `activity-feed-timeline.tsx`). A Pending query keyed under it stays fresh with no new invalidation code.
12. **The patient-actor matrix test covers every read action.** A new read on Task is reachable by `TaskVisibleToPatient` through the `action_type(:read)` policy, so it needs its own staff-only policy, like `tasks_needing_reminder`.
13. **"Mark as done" is two mutations.** `completeTaskReminder` (`tasks-api.ts`) calls `startTask` then `completeTask`, because `:complete` only accepts `:in_progress` and `:requested`. If the second call fails, the reminder is stuck in `in_progress`.
14. **The server has no timezone; the browser does the conversion.**
   - No organization or user timezone exists, and the server never converts between zones.
   - Reminders send exact instants: `toDateTimeStart` and `toDateTimeEnd` (`shared/utils/date-time-input.ts`) turn a picked date into local start and end of day, with the UTC offset.
   - The questionnaire due date is the exception. The dialog sends a plain `YYYY-MM-DD`, and `RequestQuestionnaire` stores the end of that day **in UTC**. Commit `2b80c8c` already had to work around this by accepting "yesterday" as a due date.
   - The patient portal shows the stored instant in the patient's local time (`portal/pages/request-page.tsx`, `format(parseISO(end), "PPP")`). In Spain, 23:59 UTC is 00:59 or 01:59 the next day, so **the portal already shows the due date one day late**.

## Phase 1 — Email Switch (Backend; Ships Alone)

**Configuration**
- `config/runtime.exs` runs in every environment and already loads `envs/.env`, `envs/.<env>.env` and the gitignored `envs/.<env>.overrides.env` through Dotenvy. Set the flag there, outside the `:prod` block:

  ```elixir
  # Email needs a Resend key. Outside production the mailer stays on the local
  # mailbox, so any value turns email on without sending anything.
  email_enabled? =
    config_env() == :test or System.get_env("RESEND_API_KEY") not in [nil, ""]

  config :chironium, Chironium.Notifications, email_enabled?: email_enabled?
  ```

- The existing `if api_key = System.get_env("RESEND_API_KEY")` mailer block stays inside `:prod`. That is what keeps a dummy key harmless in development: only production switches to the Resend adapter.
- `envs/.env.example`: add `RESEND_API_KEY=dev`, with a comment saying it turns on email to the local mailbox and that removing it shows the email-off flows. New setups (`cp envs/.env.example envs/.env`) keep the mailbox working as today.
- **Existing development setups:** an `envs/.env` copied before this change has no key, so email is off until the developer adds the line. Mention it in the PR description.

**`Chironium.Notifications`**
- Add `email_enabled?/0`, which reads the config above.
- `send/2` returns `:ok` without enqueueing when email is off, and logs at `debug`: `[Notifications] Email is off; skipped: invitation_created`. Callers don't change: invitations and task reminders route through `send/2` already.

**`QuestionnaireRequests.issue_links/2`**
- When `Notifications.email_enabled?()` is false, skip the email branch entirely: no email `GuestAccess` and `email_sent?: false`. An unused email access is still a live credential, so not issuing it matters more than not sending it.

**Frontend flag**
- Root layout (`root.html.heex`): `<meta name="chironium:email-enabled" content={to_string(email_enabled?())} />`, with `email_enabled?/0` in `ChironiumWeb.Layouts` calling `Notifications.email_enabled?/0`.
- New `assets/src/shared/utils/email-enabled.ts`: `isEmailEnabled()` reads that tag, the same way `request-utils.ts` reads `csrf-token`. Phase 3 uses it; Phase 1 has no UI change (finding 2).

**Docs**
- `README.md`: a short "Email" note. `RESEND_API_KEY` turns email on; in development any value works and mail goes to `/dev/mailbox`. Without it, invitations and questionnaires are shared as links.

**Resources, actions, migrations, GraphQL, i18n:** none.

**Tests**
- `notifications_test.exs`: with email off, `send/2` returns `:ok` and `refute_enqueued(worker: NotificationEmailWorker)`. The flag is global application env, so this module runs `async: false` and restores the value in `on_exit`.
- `questionnaire_request_test.exs`: with email off, a patient who has an address gets one `:link` access, no `:email` access, and `email_sent: false` in the metadata.
- `accounts_test.exs`: with email off, inviting a member still creates the invitation and enqueues no job.
- Page controller test: the meta tag reflects the flag.

## Phase 2 — Task Reminders Send Once (Ships Alone)

**`Health.Task`**
- New attribute: `reminder_sent_at :utc_datetime_usec`, `public? true`, `writable? false`. Not writable, so `update: :*` doesn't accept it.
- Pull the reminder statuses into a module attribute, `@reminder_statuses [:ready, :accepted]`. Phase 5 reuses it.
- `tasks_needing_reminder`: add `is_nil(reminder_sent_at)` to the filter.
- `send_reminder`: add `change set_attribute(:reminder_sent_at, &DateTime.utc_now/0)`.
- Clear the stamp when the date changes, so the new date gets its own reminder:

  ```elixir
  changes do
    change set_attribute(:reminder_sent_at, nil),
      on: [:update],
      where: [changing(:requested_period)]
  end
  ```

  The reminder dialogs always send `requestedPeriod`, even when only the description changes (`updateTaskReminder`). A test must confirm that resending an unchanged period doesn't count as changing. If it does, compare the old and new `start` in a small change module instead.
- `paper_trail`: add `ignore_actions [:send_reminder]` (finding 5).
- **One-step completion** (decision 14): `transition :complete, from: [:in_progress, :requested, :ready, :accepted], to: :completed`. The `:complete` action already sets `execution_period.start` to now when it is missing. `completeTaskReminder` (`tasks-api.ts`) drops `StartTaskMutation` and calls only `completeTask`.

**`Health.Changes.SendTaskReminder`**
- Load `for_patient` with `person_id`, and build the link as `/app/customers/<person_id>`.
  - The app path logic (`:app_url` config, default `/app`) lives in the private `Invitation.invitation_accept_url/1`.
  - Move it into a public helper built on `ChironiumWeb.Endpoint.url()`, for example `ChironiumWeb.AppUrl.url(path, query \\ %{})`, and call it from both places. Phase 3's `accept_url` calculation reuses it.
- The `TaskReminderEmail` button reads "View task". Change it to "View patient" (`dgettext("emails", …)`, plus `priv/gettext` `.pot` and `es` `.po`).
- Respecting the email switch needs no code: `Notifications.send/2` is already guarded (Phase 1). With email off, the trigger still runs once per task, stamps `reminder_sent_at` and sends nothing (decision 13).

**Migration**
- `mix ash.codegen task_reminder_sent_at`. Task is tenantable, so this is a tenant migration in `priv/repo/tenant_migrations` that adds one nullable column to `tasks`.
- No backfill. A task already inside its 24-hour window at deploy time gets one more email, then stops.

**GraphQL:** `Task.reminderSentAt` appears automatically.

**i18n:** backend `emails` domain only: "View patient".

**Tests** (`task_reminder_trigger_test.exs`; build the patient, care team and practitioner user with `QuestionnaireRequestFixtures.patient/2` and `practitioner_actor/2`, so emails are actually sent):
- **Regression:** run `AshOban.Test.schedule_and_run_triggers({Task, :send_reminder})` three times; exactly one `NotificationEmailWorker` job is enqueued for the practitioner.
- Rescheduling the reminder clears `reminder_sent_at`, and the next run sends again.
- Editing only the description keeps `reminder_sent_at`.
- The email's `task_url` is `…/app/customers/<person_id>`.
- `send_reminder` creates no paper trail version.
- With email off, the trigger stamps the task and enqueues nothing.
- `task_lifecycle_test.exs`: `:complete` works from `:ready` and `:accepted` in one call and sets `execution_period`.
- Update the `/tasks/abc123` fixtures in `task_reminder_email_test.exs` and `notification_email_worker_test.exs` to the new URL shape.

## Phase 3 — Share Invitations Without Email

**`Accounts.Invitation`**
- Add the calculation `accept_url` (`:string`, public), in `Chironium.Accounts.Invitation.Calculations.AcceptUrl`. It follows the `Task.Calculations.*` module pattern and calls the Phase 2 `AppUrl` helper with `inviteCode`. The `:create` after_action uses it for the email, and the private `invitation_accept_url/1` goes away.
- Add `field_policies`, so only organization admins (the owner or a `power_user` member) can read `invite_code` and `accept_url`, with `field_policy :*` → `authorize_if always()`.
  - Prefer `Chironium.Accounts.Checks.PowerUser`. These fields are read through `Organization.invitations` in the public schema, so a test must confirm that the check resolves the organization in that context.
  - If it doesn't, use an expression: `organization.owner_id == ^actor(:id) or exists(organization.organization_users, user_id == ^actor(:id) and role == :power_user)`.
- **Expiry on accept:** add `validate Chironium.Accounts.Validations.InvitationNotExpired` to `:accept`. It sits next to `principal_exists_in_org.ex` in the existing validations folder. `accept_by_invite_code` goes through `:accept`, so both paths are covered.
  - Error: `field: :expires_at`, message `Invitation expired on 2026-10-12. Ask an organization manager for a new one.`
  - Rejecting an expired invitation stays allowed, so the invitee can clear it.
  - `NULL` `expires_at` counts as expired (decision 8): the validation rejects it, and `expires_at > now()` already excludes it in SQL.
- **Manager invitations need a matching email** (decision 10): add `validate Chironium.Accounts.Validations.ManagerInvitationEmailMatches` to `:accept` and `:reject`.
  - It applies only when `role == :power_user`, and compares `invitation.email` with the actor's email. Both are `:ci_string`, so case doesn't matter.
  - The check covers `:reject` too, so someone holding a leaked link can't cancel the invitation either.
  - Error: `field: :email`, message `This manager invitation was sent to a different email address. Sign in with the invited account.` It doesn't name the invited address, because the link holder may not be the invitee.
  - Member invitations are unchanged; the test "can accept an invitation with a different email address" uses the default `:member` role and keeps passing.
- **`:renew` action** (decision 11). Renewing is not UI-only: the server must issue a new code and expiry.
  - An `update` that accepts no input, allowed only from `state: :pending`, and sets a new `invite_code` and `expires_at` to now plus 7 days.
  - Move the code generator out of the attribute default into a private `generate_invite_code/0`, used by both.
  - The same invitation row keeps its email, role and invitation-linked `PrincipalGrant`, so nothing has to be recreated.
  - When email is on, it sends the invitation email again: move the `:create` after_action that calls `Notifications.send(:invitation_created, …)` into a private function used by both actions.
  - Policy: `policy action(:renew) do authorize_if PowerUser end`, like `:revoke`.
- `current_email_invitation`: add `expires_at > now()` to the filter.

**Migrations:** none. `expires_at` exists.

**GraphQL**
- New field `Invitation.acceptUrl`. `inviteCode` and `acceptUrl` return values only for admins.
- New mutation `update :renew_invitation, :renew`, next to `revoke_invitation`. It returns `inviteCode`, `acceptUrl` and `expiresAt`.
- `InviteUsersToOrganization` (`org-api.ts`) selects the new invitation from the result:

  ```graphql
  result {
    id
    invitations(filter: { email: { eq: $email }, state: { eq: "pending" } }) {
      id
      inviteCode
      acceptUrl
      expiresAt
    }
  }
  ```

  `inviteUserToOrganization` and `inviteUserWithPrincipalGrants` return `{ url, code, expiresAt }` instead of `void`.
- The settings query adds `expiresAt` to `invitations`. It doesn't add `inviteCode` or `acceptUrl`, because members run it too.
- New document `OrganizationInvitationLinksQuery` (`getOrganization(id) { invitations { id inviteCode acceptUrl expiresAt } }`), run only by admins, only when they open a link.
- `AcceptInvitationMutation` selects `errors { message fields }`, so the UI can recognize the expiry and wrong-account errors by field.

**UI**
- **Extract `ShareLinkResult`** into `assets/src/shared/ui/share-link-result.tsx` from `questionnaire-link-result.tsx`:
  - It keeps the read-only input, Copy, `navigator.share` with the AbortError guard, `ph-no-capture`, and the rule that the URL never goes in a toast.
  - Props: `url`, `label`, `shareTitle`, `shareText`, and `children` for the notes list.
  - `QuestionnaireLinkResult` becomes a thin wrapper that passes its notes (emailed, expiry, replaced). `QuestionnaireLink` and the questionnaire dialogs don't change.
- **`invite-member-dialog.tsx`:** after success, switch to a result step, with the same `link ? result : form` shape as `SendQuestionnaireDialog`.
  - `ShareLinkResult` with the accept URL.
  - The invite code in its own read-only field with Copy, for an invitee who types it into "Join with invitation".
  - "Works until {date}" (`format(…, "PPp", { locale: getDateLocale() })`), and "Also emailed to {email}" only when `isEmailEnabled()`.
  - For a Manager invitation, a note that only the invited address can accept it (decision 10).
  - Close calls `onInvited()`. The dialog resets its state after the close animation (`onOpenChangeComplete`), so the link never outlives it.
- **Pending invitations** (settings members table):
  - `settings-member-table-model.ts`: a pending invitation whose `expiresAt` has passed gets the status "Expired" instead of "Pending invite".
  - `settings-member-actions-menu.tsx`, for unexpired rows: a "Copy link" item that opens `InvitationLinkDialog`. The dialog runs `OrganizationInvitationLinksQuery` and shows `ShareLinkResult`. A dialog avoids Safari's rule that clipboard writes must follow a user gesture directly, which an async fetch before `writeText` would break.
  - For expired rows: a "Renew" item instead. It runs `renewInvitation` and opens the same `InvitationLinkDialog` with the new link.
  - "Revoke invitation" stays on every pending row.
  - The whole menu already renders only for admins (`canManageMembers`, `settings-page.tsx`), and the field policy and the `:renew` policy enforce this on the server.
- **`PendingInvitationsDialog`:** when accepting fails, show `org_invitation_expired` for `fields: ["expiresAt"]` and `org_invitation_wrong_account` for `fields: ["email"]`, instead of the raw server message.

**i18n keys** (`assets/messages/en.json` and `es.json`, then `pnpm messages:sync`)
- Renamed, because they become shared: `questionnaire_link_copy`, `_copied`, `_copy_error`, `_share` and `_share_error` → `share_link_copy`, `share_link_copied`, `share_link_copy_error`, `share_link_share`, `share_link_share_error`.
- New:
  - `settings_invite_link_title` ("Invitation ready")
  - `settings_invite_link_desc` ("Send this link to {email}.")
  - `settings_invite_link_label` ("Invitation link")
  - `settings_invite_code_label` ("Invitation code")
  - `settings_invite_link_share_text` ("Join {organization} on Chironium")
  - `settings_invite_link_expires` ("Works until {date}.")
  - `settings_invite_link_emailed` ("We also emailed it to {email}.")
  - `settings_invite_link_manager_note` ("Only {email} can accept this manager invitation.")
  - `settings_member_copy_link` ("Copy link")
  - `settings_member_renew_invitation` ("Renew")
  - `settings_renew_invitation_error` ("Could not renew the invitation.")
  - `settings_member_status_expired` ("Expired")
  - `org_invitation_expired` ("This invitation has expired. Ask the person who invited you for a new one.")
  - `org_invitation_wrong_account` ("This invitation is for a different email address. Sign in with the account it was sent to.")
- Changed: `settings_invite_dialog_desc` drops "They will receive an email with instructions." The result step covers delivery.

**Tests**
- Backend (`accounts_test.exs`, `invitation_*_test.exs`):
  - Accepting an expired invitation fails on `expires_at` and creates no membership.
  - Accepting an unexpired one still works, including with a different email.
  - A Manager invitation fails to accept or reject for a user with a different email, creates no membership, and stays pending.
  - A Manager invitation accepts for the invited email in different letter case.
  - `current_email_invitation` excludes expired invitations.
  - A member reads `nil` for `invite_code` and `accept_url`; the owner and a power user read values.
  - `accept_url` is `<endpoint>/app?inviteCode=<code>`.
  - Renewing an expired invitation gives a new code and expiry; the old code no longer works; the new one accepts and converts the practitioner grant. Members can't renew. With email on, renewing enqueues the email.
- Frontend (Vitest):
  - `ShareLinkResult` (moved from `questionnaire-link-result.test.tsx`, keeping its "not in the toast" case).
  - `invite-member-dialog.test.tsx` shows the link and code after inviting, and the emailed note only when email is enabled.
  - `settings-member-table-model` marks expired invitations.
  - The actions menu shows "Copy link" on unexpired rows and "Renew" on expired ones.
- Playwright (`practitioners.spec.ts`, which already uses `/dev/playwright/invitation-code`): invite, read the link from the dialog, open it as a second user, and accept. Also cover a signed-out invitee who signs in and lands on the accept dialog.

## Phase 4 — Local Due Dates and Overdue Status in the Activity Feed

**Due date as a local instant** (decision 12, finding 14). This changes code from #189.
- `send-questionnaire-dialog.tsx` sends `dueAt: toDateTimeEnd(dueDate)`, the end of the picked day in the practitioner's timezone, like the reminder dialogs.
- `Task.request_questionnaire`: the argument `due_date :date` becomes `due_at :utc_datetime_usec`.
- `RequestQuestionnaire`:
  - Stores `requested_period.end = due_at`.
  - Rejects `due_at` in the past by comparing it with `now`. The "yesterday" workaround from `2b80c8c` goes away.
- `QuestionnaireRequests.access_expires_at/2` takes the instant: `max(now + 7 days, due_at + 1 day)`, capped at `now + 14 days`. `end_of_day/1` is no longer needed there.
- `ReissueQuestionnaireLink`: a `due_at` already in the past no longer extends the window, as today, but compared as instants.
- `questionnaire-request-event.tsx` formats the due date with `format(parseISO(end), "PP")` instead of `end.slice(0, 10)`, which read the UTC date.
- The portal's "Please answer by {date}" then shows the right day for a patient in the same timezone as the practitioner.
- Existing requests keep their UTC end of day; no migration.

**`Health.Task`**
- New calculation `due_at` (`:utc_datetime_usec`, public), an expression in the style of `requested_period_start_sort_key`:

  ```elixir
  calculate :due_at, :utc_datetime_usec,
    expr(
      if is_nil(focus_questionnaire_id) do
        fragment("(?->>'start')::timestamptz", requested_period)
      else
        fragment("(?->>'end')::timestamptz", requested_period)
      end
    ) do
    description "When the task is due: a reminder's date, or a questionnaire's due date"
    public? true
  end
  ```

  A questionnaire without a due date has no `due_at` and is never overdue (decision 1). Phase 5 filters on it.

**Migrations:** none. The calculation is an expression.

**GraphQL**
- `requestQuestionnaire` input: `dueDate: Date` becomes `dueAt: DateTime`.
- `Task.dueAt`. Add it to `ListTasksForPatient`.

**UI**
- `questionnaire-request-status.ts`:
  - Add `"overdue"` to `QuestionnaireRequestStatus`, and `dueAt` to `QuestionnaireRequestState`.
  - Order: completed → cancelled → expired → overdue (`dueAt != null && dueAt <= now`) → opened → sent. "Expired" wins, because the practitioner must resend before anything else can happen.
  - `isOpenQuestionnaireRequest` includes `"overdue"`, so Resend and Cancel stay available.
- `questionnaire-request-event.tsx`: `STATUS_BADGE.overdue = { variant: "warning", label: m.questionnaire_request_status_overdue }`.

**i18n keys:** `questionnaire_request_status_overdue` ("Overdue").

**Tests**
- `questionnaire-request-status.test.ts`:
  - Overdue the day after the due date, while the link still works.
  - Not overdue before the due date.
  - Expired wins after the link expiry.
  - Without a due date: never overdue; sent until expiry, then expired.
  - Completed and cancelled are never overdue.
- Backend:
  - `due_at` for a reminder, for a questionnaire with a due date, and `nil` for one without.
  - A due date picked as local end of day west and east of UTC is accepted for today, and rejected once it has passed.
  - `access_expires_at/2` keeps its 7-day floor and 14-day ceiling with an instant.
  - Update the existing due date tests in `questionnaire_request_test.exs` to `due_at`.
- Frontend: `send-questionnaire-dialog` sends `dueAt` as local end of day.

## Phase 5 — Pending Page

**`Health.Task`**
- New read action:

  ```elixir
  read :pending do
    description "Questionnaire requests that are overdue or whose link expired, and due reminders."

    filter expr(
             (not is_nil(focus_questionnaire_id) and
                status in ^TaskVisibleToPatient.open_statuses() and
                (due_at <= now() or access_expires_at <= now())) or
               (is_nil(focus_questionnaire_id) and status in ^@reminder_statuses and
                  due_at <= now())
           )

    prepare build(sort: [requested_period_start_sort_key: :asc])
  end
  ```

  The questionnaire branch follows decision 2, and the reminder branch follows decision 5. The statuses match the reminder trigger, so a completed or cancelled reminder drops off. Rows sort by when they were sent or scheduled, oldest first.
- Policy: `policy action(:pending) do authorize_if StaffActor end` (finding 12). Visibility needs nothing new: the existing `action_type(:read)` policy limits practitioners to their care teams' patients, and power users see the whole organization.

**Migrations:** none.

**GraphQL**
- `list :list_pending_tasks, :pending, paginate_with: nil`.
  - It returns the full list, which is what the counter needs. `# ponytail:` comment: unbounded list; add keyset pagination and a separate count if one organization ever has hundreds of pending items.
- New document `ListPendingTasks` in `tasks-api.ts`:

  ```graphql
  id
  status
  description
  dueAt
  accessExpiresAt
  focusQuestionnaireId
  focusQuestionnaire { title }
  forPatient { id personId person { name { text given family prefix } } }
  ```

**UI**
- `assets/src/features/tasks/hooks/use-pending-tasks.ts`: `useQuery` with key `[...tasksListQueryKey(orgId), "pending"]`. Every existing task mutation already invalidates that prefix (finding 11). The page and the side menu share it, so the counter costs no extra request. No polling: React Query refetches on window focus.
- Route `assets/src/routes/_app/pending.tsx`, lazily loading `features/tasks/pages/pending-page.tsx`, like `questionnaires.tsx`. `routeTree.gen.ts` regenerates on its own.
- **`pending-page.tsx`:** a header, then one `Card` row per item, the same responsive single-component layout as `questionnaires-page.tsx`.
  - **Patient:** `formatPersonName(person.name)`, linking to `/customers/$customerId` with `personId`.
  - **What:** "Questionnaire: {title}" with its status badge (overdue or link expired, reusing `QuestionnaireRequestStatusBadge` and `questionnaireRequestStatus`), or "Reminder: {description}".
  - **When:** for overdue items, "Due {date}" plus "{time} late", using `formatDistanceToNowStrict(dueAt, { locale: getDateLocale() })`. It says "3 days" or "5 hours" with no bucket keys of our own (`AGENTS.md`, date-fns for relative time). For a link-expired request without a due date, the existing "Link expired {time}" text.
  - **Actions:** questionnaire rows reuse `QuestionnaireRequestActions` (Resend and Cancel, behind confirmations). It moves from `customers/ui/detail/activity-feed/` to `questionnaires/ui/request/` now that two features use it. Reminder rows get "Mark as done", which calls `completeTaskReminder` (one mutation after Phase 2) and toasts `review_task_completed`, as the feed's `TaskReminderEditAction` does.
  - **Empty:** `EmptyState` with a check icon.
- **Side menu:**
  - `nav-config.ts`: add `{ to: "/pending", label: m.nav_pending, icon: BellRing, showsPendingCount: true }` after Customers.
  - `side-nav.tsx`: `SideNav` and `MobileSideNav` call `usePendingTasks()` once and pass `count` to `NavItemLink`.
  - The count renders as a pill after the label when the sidebar is wide, and as a dot on the icon when it collapses to `w-18`. Both are pure Tailwind breakpoints, like the label's `hidden md:block`. Hidden at 0.
  - The link's `aria-label` includes the count.

**i18n keys**
- `nav_pending` ("Pending")
- `nav_pending_count` ("Pending, {count} items")
- `pending_title` ("Pending")
- `pending_subtitle` ("Questionnaires and reminders that need your attention.")
- `pending_questionnaire` ("Questionnaire: {title}")
- `pending_reminder` ("Reminder: {description}")
- `pending_due` ("Due {date}")
- `pending_late` ("{time} late")
- `pending_mark_done` ("Mark as done")
- `pending_mark_done_error` ("Could not mark the reminder as done.")
- `pending_empty_title` ("Nothing pending")
- `pending_empty_desc` ("Overdue questionnaires, expired links and due reminders show up here.")

**Tests**
- Backend (new `test/chironium/health/pending_tasks_test.exs`):
  - It lists a questionnaire past its due date, one without a due date whose link expired, and a reminder whose date has arrived.
  - It excludes a questionnaire without a due date whose link still works, items not yet due, and completed or cancelled ones.
  - It sorts oldest first.
  - A practitioner doesn't see another care team's patients; a power user does.
  - A patient actor is forbidden. The matrix test must also pass unchanged.
- Frontend (Vitest):
  - The page renders both row kinds, the late text and the right actions. "Mark as done" calls `completeTaskReminder`.
  - The empty state shows.
  - The nav count shows a number and hides at 0.
- Playwright: add a reminder dated today from the patient page, open Pending, see it with the counter at 1, mark it as done, and see the counter disappear. If the reminder dialog rejects the current date, seed the task through the Playwright fixtures controller instead.

## Out of Scope

- **Timezone in server-rendered dates.** Emails format dates on the server, which has no timezone, so the questionnaire email's "works until" date shows the UTC date. That date can be a day off, for example for a link sent in Spain shortly after midnight. Fixing it needs an organization timezone.
- Rate limiting `acceptInvitation`. Codes are 40 bits (`Base.encode32` of 5 random bytes) and accepting requires a signed-in user, so guessing isn't practical.
- Per-user notification preferences. `Notifications.send/2` keeps its single email channel.
- Overdue alerts by email. Pending work shows only in the web interface.

## Implementation Notes

Where the build differs from the plan above:

- **Phase 1: tests turn email off with `Chironium.DataCase.disable_email/0`.** It sets the flag and restores it in `on_exit`. Every module that calls it runs `async: false`, so `notifications_test.exs` is no longer async.
- **Phase 1: the meta tag test stubs the Vite manifest.** `PageControllerTest` renders `/app` through the root layout, which reads `priv/static/.vite/manifest.json`. CI runs `mix test` before the assets build, so the test seeds PhoenixVite's manifest cache when the file is missing.
- **Phase 1: `isEmailEnabled()` has no importers yet.** It stays despite the dead code policy, because Phase 3 uses it.
- **Phase 2: reminder emails had never worked for a real patient.** With a patient and a care team, the regression test first crashed twice in `SendTaskReminder`, before any repeat could show: `format_human_name/1` used `name[:given]` on the `HumanName` struct, which has no `Access`, and the `PrincipalGrant` lookup filtered on `organization_id`, a field the tenant-scoped resource doesn't have. Each failed run rolled back and Oban retried it, so no email was sent. The fix drops the `organization_id` filter and replaces `format_human_name/1` with `QuestionnaireRequests.display_name/1`, so names now prefer `HumanName.text`, as the requester name already does.
- **Phase 2: `changing(:requested_period)` works as planned.** Resending an unchanged period, as the reminder dialogs do, doesn't clear `reminder_sent_at`, so no change module was needed.
- **Phase 2: `ChironiumWeb.AppUrl.url/2` takes the query as a map or a keyword list**, for example `AppUrl.url("", inviteCode: code)`. `Invitation` already calls it for the email's accept URL, so Phase 3 only has to move that call into the `AcceptUrl` calculation.
- **Phase 2: `StartTaskMutation` is gone.** `completeTaskReminder` was its only user.
- **Phase 3: the admin check is a private calculation, not `PowerUser`.** Reading through `Organization.invitations` has no tenant, so `PowerUser` can't find the organization and denies the owner too. Field policy expressions can't reference relationships, so `Invitation.actor_is_organization_admin` holds the planned expression, and the field policy reads it.
- **Phase 3: `:renew` uses the same calculation instead of `PowerUser`.** `PowerUser` trusts the request's tenant, while an invitation lives in the public schema, so a power user of another organization could renew it by ID. `:revoke` keeps `PowerUser` and still has that gap.
- **Phase 3: invitees no longer read their own code.** `current_email_invitation` returns the invitation with `invite_code` forbidden, as the plan intends. `accounts_test.exs` reads it with `authorize?: false` to get a code to accept with.
- **Phase 3: GraphQL error `fields` are snake_case.** Accepting returns `fields: ["expires_at"]` or `["email"]`, not `expiresAt`. `unwrapMutationResult` now throws a `MutationError` that carries `fields`, and `PendingInvitationsDialog` matches those names.
- **Phase 3: `InvitationLinkDialog` fetches one invitation.** `OrganizationInvitationLinksQuery` filters `invitations` by ID, so the admin's browser receives only the code it shows. After renewing, the dialog shows the link the mutation returned and skips the fetch.
- **Phase 3: three extra i18n keys, one removed.** The invite code has its own Copy button, so it gets `settings_invite_code_copied` and `settings_invite_code_copy_error`; `settings_invite_link_load_error` covers a failed fetch. `settings_invite_success` ("Invitation sent.") is gone: the result step replaces that toast, which was wrong with email off. Each Copy button's accessible name includes its field label, because the invite result has two.
- **Phase 3: the Playwright session endpoint returns `returnTo`.** E2E sessions skip `AuthController.success`, so `/dev/playwright/session` now reads and clears the signed return state and returns its URL. The signed-out invitee test follows it as a real sign-in would.
- **Phase 4: `Task.due_at` converts to UTC inside the fragment.** AshPostgres reads the calculation back as a timestamp without a zone, so `(?->>'start')::timestamptz` came back shifted by the database session's timezone (an hour off with a local Postgres set to `Europe/Zurich`). The fragments use `::timestamptz AT TIME ZONE 'UTC'`. `requested_period_start_sort_key` has the same shift; it only sorts, so it stays as it is. The `due_at` tests in `questionnaire_request_test.exs` catch this only when the test database's timezone isn't UTC.
- **Phase 5: a patient reading `:pending` gets an empty list, not an error.** Ash filters a read to nothing when a policy can't pass, as it already does for `tasks_needing_reminder`. The test checks that the patient's own overdue request, visible through `:read`, doesn't show up in `:pending`.
- **Phase 5: `nav_pending_count` reads "Pending items: {count}".** The planned "Pending, {count} items" says "1 items".
- **Phase 5: `QuestionnaireRequestStatusBadge` stays in `questionnaire-request-event.tsx`.** Only `QuestionnaireRequestActions` moved; the Pending page imports the badge from the activity feed folder.
- **Phase 5: a link-expired request shows "Link expired {time}" whenever its due date hasn't passed**, not only when it has none. The link can expire before the due date when the 14-day cap applies.
- **Phase 5: the Playwright helpers moved to `e2e/helpers.ts`.** `bootstrapSession`, `createOrg`, `createCustomer` and `openCustomerDetail` came out of `questionnaire-links.spec.ts`, so `pending.spec.ts` reuses them. `createOrg` now takes the organization name.

## Follow-ups

- **P1, out of scope: a reminder due today reads "1 day ago" in the activity feed east of UTC.** The card shows "1 day ago · Oct 20, 2026" on October 20, and the day group heading also says "1 day ago". The reminder dialog stores the start of the local day, which the API returns as the previous day in UTC (`2026-10-19T22:00:00Z` in Spain). `toIsoDateString` slices that UTC date, while the absolute date beside it is formatted in local time. Repro: with the browser in Europe/Madrid, add a reminder dated today from a patient page and read its card. Location: `assets/src/features/customers/utils/activity-feed-dates.ts:6` (used at lines 12 and 23). This work doesn't change that file; the Pending page formats dates locally and is not affected.
- **P2, out of scope: creating an organization once stopped on step 2 with a "GraphQL error" banner.** During one 375px run, the Create organization dialog stayed on step 2 of 2 (Subscription plans) after the plan form was filled in, and the organization-created toast never appeared. Two re-runs created the organization without trouble, so it is probably a transient or timing issue. Repro: run a spec that calls `createOrg` at 375px width; it failed once in three runs. Location: `assets/e2e/helpers.ts:56` (`createOrg`, create-organization dialog).
