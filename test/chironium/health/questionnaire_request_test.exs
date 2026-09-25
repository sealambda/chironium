defmodule Chironium.Health.QuestionnaireRequestTest do
  use Chironium.DataCase, async: false
  use Oban.Testing, repo: Chironium.Repo

  import Chironium.QuestionnaireRequestFixtures

  require Ash.Query

  alias Chironium.Accounts.GuestAccess
  alias Chironium.Health.Observation
  alias Chironium.Health.QuestionnaireRequests
  alias Chironium.Health.QuestionnaireResponse
  alias Chironium.Health.Task

  setup do
    ctx = organization_context()
    patient = patient(ctx)

    Map.merge(ctx, %{
      patient: patient,
      practitioner: practitioner_actor(ctx, patient),
      questionnaire: questionnaire(ctx)
    })
  end

  describe "request_questionnaire" do
    test "creates an SDC request with a link and an email", ctx do
      task =
        request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire, %{
          message: "Before Friday"
        })

      assert task.status == :requested
      assert task.intent == :order
      assert [%{code: "complete-questionnaire"}] = task.code.coding
      assert task.focus_questionnaire_id == ctx.questionnaire.id
      assert task.requester_practitioner_id == ctx.practitioner.id
      assert task.description == "Before Friday"
      assert task.__metadata__.link_url =~ "/portal/sign-in?token="
      assert task.__metadata__.email_sent

      assert [:email, :link] = task |> accesses() |> Enum.map(& &1.channel) |> Enum.sort()

      email_access = access(task, :email)

      # The job carries IDs only; the token is minted when the email is sent.
      assert_enqueued(
        worker: Chironium.Workers.NotificationEmailWorker,
        args: %{
          "type" => "questionnaire_requested",
          "params" => %{"guest_access_id" => email_access.id, "tenant" => ctx.tenant}
        }
      )
    end

    test "only issues the link when the patient has no email address", ctx do
      patient = patient(ctx, nil)
      practitioner = practitioner_actor(ctx, patient)
      task = request!(ctx, practitioner, patient, ctx.questionnaire)

      refute task.__metadata__.email_sent
      assert [%{channel: :link}] = accesses(task)
      refute_enqueued(worker: Chironium.Workers.NotificationEmailWorker)
    end

    test "rejects a questionnaire that is not active", ctx do
      draft = questionnaire(ctx, :draft)

      assert {:error, %Ash.Error.Invalid{} = error} =
               request(ctx, ctx.practitioner, ctx.patient, draft)

      assert Exception.message(error) =~ "only active ones can be sent"
    end

    test "rejects a due date in the past", ctx do
      assert {:error, %Ash.Error.Invalid{}} =
               request(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire, %{
                 due_date: Date.add(Date.utc_today(), -2)
               })
    end

    test "practitioners cannot target patients outside their care team", ctx do
      stranger = patient(ctx, "stranger@example.com")

      assert {:error, _} = request(ctx, ctx.practitioner, stranger, ctx.questionnaire)
      assert Ash.read!(Task, tenant: ctx.tenant, authorize?: false) == []
    end

    test "power users can request for any patient", ctx do
      task = request!(ctx, ctx.owner, ctx.patient, ctx.questionnaire)

      assert task.status == :requested
      assert is_nil(task.requester_practitioner_id)
    end
  end

  describe "access_expires_at/2" do
    @now ~U[2026-09-24 10:00:00Z]

    test "is never earlier than 7 days" do
      assert QuestionnaireRequests.access_expires_at(nil, @now) == ~U[2026-10-01 10:00:00Z]

      assert QuestionnaireRequests.access_expires_at(~D[2026-09-25], @now) ==
               ~U[2026-10-01 10:00:00Z]
    end

    test "extends to the end of the day after a later due date" do
      assert QuestionnaireRequests.access_expires_at(~D[2026-10-03], @now) ==
               ~U[2026-10-04 23:59:59.999999Z]
    end

    test "is never later than 14 days" do
      assert QuestionnaireRequests.access_expires_at(~D[2026-12-01], @now) ==
               ~U[2026-10-08 10:00:00Z]
    end

    test "link and session tokens outlive the access window", ctx do
      task =
        request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire, %{
          due_date: Date.add(Date.utc_today(), 60)
        })

      link_token = token_from_url(task.__metadata__.link_url)
      {:ok, guest_access} = sign_in(link_token)

      # The static token lifetimes are ceilings; `expires_at` is the real limit.
      for token <- [link_token, guest_access.__metadata__.token] do
        {:ok, %{"iat" => issued_at, "exp" => expires_at}} = AshAuthentication.Jwt.peek(token)

        assert expires_at - issued_at == 14 * 24 * 60 * 60
        assert expires_at >= DateTime.to_unix(task.access_expires_at)
      end
    end

    test "is stored on the task and its accesses", ctx do
      task =
        request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire, %{
          due_date: Date.add(Date.utc_today(), 60)
        })

      days = DateTime.diff(task.access_expires_at, DateTime.utc_now(), :hour) / 24
      assert days > 13.9 and days <= 14
      assert Enum.all?(accesses(task), &(&1.expires_at == task.access_expires_at))
    end
  end

  describe "links" do
    test "sign-in does not claim; reuse after claiming fails", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      token = token_from_url(task.__metadata__.link_url)

      {claimed, _patient} = open_link(task)
      assert claimed.claimed_at

      assert {:error, _} = sign_in(token)
    end

    test "claiming the link revokes the email link", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      {:ok, email_url} = GuestAccess.sign_in_url(access(task, :email))

      open_link(task)

      assert reload(access(task, :email)).revoked_at
      assert {:error, _} = email_url |> token_from_url() |> sign_in()
    end

    test "opening a link starts the task, attributed to the patient", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      open_link(task)

      assert reload(ctx, task).status == :in_progress
      assert Enum.any?(task_versions(ctx, task), &(&1.changed_by_patient_id == ctx.patient.id))
    end

    test "an unopened link works until it expires", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      token = token_from_url(task.__metadata__.link_url)

      expire!(access(task, :link))
      assert {:error, _} = sign_in(token)

      expire!(access(task, :link), DateTime.add(DateTime.utc_now(), 3, :day))
      assert {:ok, _} = sign_in(token)
    end

    test "a session lasts until the access expires", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      {claimed, _patient} = open_link(task)

      assert {:ok, _} = session(claimed)

      expire!(claimed)
      assert {:error, _} = session(claimed)
    end

    test "submitting ends the session", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      {claimed, patient} = open_link(task)

      assert {:ok, _} = submit(ctx, patient, task)
      assert {:error, _} = session(claimed)
    end

    test "cancelling ends every link and session", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      {claimed, _patient} = open_link(task)

      task
      |> Ash.Changeset.for_update(:cancel, %{}, actor: ctx.practitioner, tenant: ctx.tenant)
      |> Ash.update!()

      assert {:error, _} = session(claimed)
      assert Enum.all?(accesses(task), & &1.revoked_at)
    end

    test "reissuing replaces the links", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      old_token = token_from_url(task.__metadata__.link_url)

      reissued =
        task
        |> Ash.Changeset.for_update(:reissue_questionnaire_link, %{},
          actor: ctx.practitioner,
          tenant: ctx.tenant
        )
        |> Ash.update!()

      assert reissued.__metadata__.link_url != task.__metadata__.link_url
      assert {:error, _} = sign_in(old_token)
      assert {:ok, _} = reissued.__metadata__.link_url |> token_from_url() |> sign_in()
      assert length(accesses(task)) == 4
      assert length(Enum.reject(accesses(task), & &1.revoked_at)) == 2
    end

    test "only open questionnaire requests can be reissued", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      {_claimed, patient} = open_link(task)
      {:ok, _} = submit(ctx, patient, task)

      assert {:error, %Ash.Error.Invalid{}} =
               ctx
               |> reload(task)
               |> Ash.Changeset.for_update(:reissue_questionnaire_link, %{},
                 actor: ctx.practitioner,
                 tenant: ctx.tenant
               )
               |> Ash.update()
    end
  end

  describe "submit_from_portal" do
    test "records a completed, self-reported response and completes the task", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      {_claimed, patient} = open_link(task)

      assert {:ok, response} = submit(ctx, patient, task)

      assert response.status == :completed
      assert response.subject_id == ctx.patient.id
      assert response.author_patient_id == ctx.patient.id
      assert is_nil(response.author_id)
      assert response.task_id == task.id
      assert response.questionnaire_id == ctx.questionnaire.id
      assert reload(ctx, task).status == :completed

      [observation] =
        Observation
        |> Ash.Query.filter(derived_from_response_id == ^response.id)
        |> Ash.Query.load(:self_reported)
        |> Ash.read!(authorize?: false, tenant: ctx.tenant)

      assert observation.self_reported
    end

    test "attributes the response and task changes to the patient", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      {_claimed, patient} = open_link(task)
      {:ok, response} = submit(ctx, patient, task)

      [version] =
        QuestionnaireResponse.Version
        |> Ash.Query.filter(version_source_id == ^response.id)
        |> Ash.read!(authorize?: false, tenant: ctx.tenant)

      assert version.changed_by_patient_id == ctx.patient.id

      assert Enum.any?(
               task_versions(ctx, task),
               &(&1.changed_by_patient_id == ctx.patient.id and
                   &1.version_action_name == :complete)
             )
    end

    test "rejects a second submission", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      {_claimed, patient} = open_link(task)

      assert {:ok, _} = submit(ctx, patient, task)
      assert {:error, _} = submit(ctx, patient, task)
    end

    test "rejects a task outside the session's scope", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      other = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      {_claimed, patient} = open_link(task)

      assert {:error, %Ash.Error.Invalid{}} = submit(ctx, patient, other)
    end

    test "rejects another patient's task", ctx do
      other_patient = patient(ctx, "other@example.com")
      other_task = request!(ctx, ctx.owner, other_patient, ctx.questionnaire)
      {_claimed, other_actor} = open_link(other_task)

      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      patient = Ash.Resource.put_metadata(ctx.patient, :scope, nil)

      assert {:error, %Ash.Error.Invalid{}} = submit(ctx, patient, other_task)
      assert {:error, %Ash.Error.Invalid{}} = submit(ctx, other_actor, task)
    end

    test "staff cannot submit on the patient's behalf, even power users", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)

      assert {:error, %Ash.Error.Forbidden{}} = submit(ctx, ctx.owner, task)
      assert {:error, %Ash.Error.Forbidden{}} = submit(ctx, ctx.practitioner, task)
    end
  end

  describe "patient visibility" do
    test "a patient sees their open request, its questionnaire and who sent it", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      {_claimed, patient} = open_link(task)

      assert [loaded] =
               Task
               |> Ash.Query.load([:focus_questionnaire, :requester_name, :organization_name])
               |> Ash.read!(actor: patient, tenant: ctx.tenant)

      assert loaded.id == task.id
      assert loaded.focus_questionnaire.id == ctx.questionnaire.id
      assert loaded.requester_name == "Dr. Rivera"
      assert loaded.organization_name == ctx.organization.name
    end

    test "internal fields and history stay hidden from the patient", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)

      ctx
      |> reload(task)
      |> Ash.Changeset.for_update(
        :update,
        %{note: [%{text: "Internal", author_string: "Dr. Rivera"}]},
        actor: ctx.owner,
        tenant: ctx.tenant
      )
      |> Ash.update!()

      {_claimed, patient} = open_link(task)

      [loaded] =
        Task
        |> Ash.Query.load(:paper_trail_versions)
        |> Ash.read!(actor: patient, tenant: ctx.tenant)

      assert %Ash.ForbiddenField{} = loaded.note
      assert loaded.paper_trail_versions == []
    end

    test "staff still see internal fields", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)

      ctx
      |> reload(task)
      |> Ash.Changeset.for_update(
        :update,
        %{note: [%{text: "Internal", author_string: "Dr. Rivera"}]},
        actor: ctx.owner,
        tenant: ctx.tenant
      )
      |> Ash.update!()

      for actor <- [ctx.owner, ctx.practitioner] do
        [loaded] = Ash.read!(Task, actor: actor, tenant: ctx.tenant)
        assert [%{text: "Internal"}] = loaded.note
      end
    end

    test "a patient cannot see another patient's request", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      other_patient = patient(ctx, "other@example.com")
      other_task = request!(ctx, ctx.owner, other_patient, ctx.questionnaire)
      {_claimed, other_actor} = open_link(other_task)

      assert [%{id: id}] = Ash.read!(Task, actor: other_actor, tenant: ctx.tenant)
      assert id == other_task.id
      assert {:error, _} = Ash.get(Task, task.id, actor: other_actor, tenant: ctx.tenant)
    end

    test "a link session sees only its own request", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      _other = request!(ctx, ctx.practitioner, ctx.patient, questionnaire(ctx))
      {_claimed, patient} = open_link(task)

      assert [%{id: id}] = Ash.read!(Task, actor: patient, tenant: ctx.tenant)
      assert id == task.id

      assert [%{id: questionnaire_id}] =
               Ash.read!(Chironium.Health.Questionnaire, actor: patient, tenant: ctx.tenant)

      assert questionnaire_id == ctx.questionnaire.id
    end

    test "a submitted request drops out of the patient's view", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      {_claimed, patient} = open_link(task)
      {:ok, _} = submit(ctx, patient, task)

      assert Ash.read!(Task, actor: patient, tenant: ctx.tenant) == []
    end

    test "practitioner and organization records stay closed to the patient", ctx do
      task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
      {_claimed, patient} = open_link(task)

      assert Ash.read!(Chironium.Health.Practitioner, actor: patient, tenant: ctx.tenant) == []
      assert Ash.read!(Chironium.Accounts.Organization, actor: patient) == []

      assert Ash.read!(Chironium.CRM.Person,
               actor: patient,
               tenant: ctx.tenant,
               page: [limit: 10]
             ).results ==
               []
    end
  end

  test "reminders skip questionnaire requests", ctx do
    task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)

    Chironium.Repo.query!(
      ~s(UPDATE "#{ctx.tenant}".tasks SET status = 'accepted', requested_period = $1 WHERE id = $2),
      [%{"start" => DateTime.add(DateTime.utc_now(), 1, :hour)}, Ecto.UUID.dump!(task.id)]
    )

    assert Task
           |> Ash.Query.for_read(:tasks_needing_reminder)
           |> Ash.read!(authorize?: false, tenant: ctx.tenant, page: [limit: 10])
           |> Map.get(:results) == []
  end

  defp session(guest_access) do
    guest_access
    |> AshAuthentication.user_to_subject()
    |> AshAuthentication.subject_to_user(GuestAccess)
  end

  defp task_versions(ctx, task) do
    Task.Version
    |> Ash.Query.filter(version_source_id == ^task.id)
    |> Ash.read!(authorize?: false, tenant: ctx.tenant)
  end
end
