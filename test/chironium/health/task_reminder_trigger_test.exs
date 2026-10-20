defmodule Chironium.Health.TaskReminderTriggerTest do
  @moduledoc """
  Tests for the AshOban send_reminder trigger on Health.Task.

  Verifies that the scheduler picks up tasks in the correct states
  with requested_period.start within the next 24 hours, and skips
  tasks that don't match.
  """
  use Chironium.DataCase, async: false
  use Oban.Testing, repo: Chironium.Repo

  import Chironium.Generator

  require Ash.Query

  alias Chironium.QuestionnaireRequestFixtures, as: Fixtures
  alias Chironium.Workers.NotificationEmailWorker

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  describe "send_reminder trigger scheduling" do
    test "schedules a job for a :ready task starting within 24h", ctx do
      task = create_task(ctx, :ready, hours_from_now(6))

      assert %{success: success} =
               AshOban.Test.schedule_and_run_triggers({Chironium.Health.Task, :send_reminder})

      # 1 scheduler + 1 worker = 2 successes.
      assert success >= 2

      reloaded = Ash.get!(Chironium.Health.Task, task.id, tenant: ctx.tenant, authorize?: false)
      assert reloaded.id == task.id
    end

    test "schedules a job for an :accepted task starting within 24h", ctx do
      task = create_task(ctx, :accepted, hours_from_now(12))

      assert %{success: success} =
               AshOban.Test.schedule_and_run_triggers({Chironium.Health.Task, :send_reminder})

      assert success >= 2

      reloaded = Ash.get!(Chironium.Health.Task, task.id, tenant: ctx.tenant, authorize?: false)
      assert reloaded.id == task.id
    end

    test "does not schedule a job for a :draft task", ctx do
      _task = create_task(ctx, :draft, hours_from_now(6))

      assert %{success: 1} =
               AshOban.Test.schedule_and_run_triggers({Chironium.Health.Task, :send_reminder})
    end

    test "does not schedule a job for a task starting more than 24h from now", ctx do
      _task = create_task(ctx, :ready, hours_from_now(48))

      assert %{success: 1} =
               AshOban.Test.schedule_and_run_triggers({Chironium.Health.Task, :send_reminder})
    end

    test "does not schedule a job for a task with start in the past", ctx do
      _task = create_task(ctx, :ready, hours_from_now(-2))

      assert %{success: 1} =
               AshOban.Test.schedule_and_run_triggers({Chironium.Health.Task, :send_reminder})
    end

    test "does not schedule a job for a task without requested_period", ctx do
      _task = create_task(ctx, :ready, nil)

      assert %{success: 1} =
               AshOban.Test.schedule_and_run_triggers({Chironium.Health.Task, :send_reminder})
    end
  end

  describe "send_reminder emails" do
    setup do
      ctx = Fixtures.organization_context()
      patient = Fixtures.patient(ctx)
      Fixtures.practitioner_actor(ctx, patient)
      Map.put(ctx, :patient, patient)
    end

    test "sends one email per reminder, however often the trigger runs", ctx do
      create_reminder(ctx, hours_from_now(6))

      for _ <- 1..3, do: run_trigger()

      assert [_job] = reminder_jobs()
    end

    test "rescheduling clears reminder_sent_at, and the next run sends again", ctx do
      task = create_reminder(ctx, hours_from_now(6))
      run_trigger()
      assert reload(ctx, task).reminder_sent_at

      rescheduled = update!(ctx, task, %{requested_period: %{start: hours_from_now(12)}})
      assert rescheduled.reminder_sent_at == nil

      run_trigger()
      assert [_, _] = reminder_jobs()
      assert reload(ctx, task).reminder_sent_at
    end

    test "editing only the description keeps reminder_sent_at", ctx do
      task = create_reminder(ctx, hours_from_now(6))
      run_trigger()
      sent = reload(ctx, task)

      # The reminder dialogs always resend the period, even when it is unchanged.
      updated =
        update!(ctx, sent, %{
          description: "New description",
          requested_period: %{start: DateTime.to_iso8601(sent.requested_period.start), end: nil}
        })

      assert updated.reminder_sent_at == sent.reminder_sent_at
    end

    test "links the email to the patient page", ctx do
      create_reminder(ctx, hours_from_now(6))
      run_trigger()

      assert [%{args: %{"params" => %{"task_url" => url}}}] = reminder_jobs()
      assert url == "#{ChironiumWeb.Endpoint.url()}/app/customers/#{ctx.patient.person_id}"
    end

    test "creates no paper trail version", ctx do
      task = create_reminder(ctx, hours_from_now(6))
      before = versions(ctx, task)

      run_trigger()

      assert reload(ctx, task).reminder_sent_at
      assert versions(ctx, task) == before
    end

    test "with email off, stamps the task and enqueues nothing", ctx do
      disable_email()
      task = create_reminder(ctx, hours_from_now(6))

      run_trigger()

      assert reload(ctx, task).reminder_sent_at
      assert reminder_jobs() == []
    end
  end

  # -- Helpers ---------------------------------------------------------------

  defp create_reminder(ctx, start) do
    Chironium.Health.Task
    |> Ash.Changeset.for_create(
      :create,
      %{intent: :order, for_patient_id: ctx.patient.id, requested_period: %{start: start}},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
    |> transition_to(:ready, ctx.tenant)
  end

  defp run_trigger,
    do: AshOban.Test.schedule_and_run_triggers({Chironium.Health.Task, :send_reminder})

  defp reminder_jobs, do: all_enqueued(worker: NotificationEmailWorker)

  defp update!(ctx, task, attrs) do
    task
    |> Ash.Changeset.for_update(:update, attrs, authorize?: false, tenant: ctx.tenant)
    |> Ash.update!()
  end

  defp reload(ctx, task), do: Fixtures.reload(ctx, task)

  defp versions(ctx, task) do
    Chironium.Health.Task.Version
    |> Ash.Query.filter(version_source_id == ^task.id)
    |> Ash.read!(authorize?: false, tenant: ctx.tenant)
    |> Enum.map(& &1.id)
  end

  defp create_task(ctx, status, requested_period) do
    period_attrs =
      if requested_period, do: %{requested_period: %{start: requested_period}}, else: %{}

    task =
      Chironium.Health.Task
      |> Ash.Changeset.for_create(
        :create,
        Map.merge(%{intent: :order, for_patient_id: nil}, period_attrs),
        authorize?: false,
        tenant: ctx.tenant
      )
      |> Ash.create!()

    transition_to(task, status, ctx.tenant)
  end

  defp transition_to(task, :draft, _tenant), do: task

  defp transition_to(task, :ready, tenant) do
    task
    |> Ash.Changeset.for_update(:ready, %{}, authorize?: false, tenant: tenant)
    |> Ash.update!()
  end

  defp transition_to(task, :accepted, tenant) do
    task
    |> Ash.Changeset.for_update(:ready, %{}, authorize?: false, tenant: tenant)
    |> Ash.update!()
    |> Ash.Changeset.for_update(:request, %{}, authorize?: false, tenant: tenant)
    |> Ash.update!()
    |> Ash.Changeset.for_update(:accept, %{}, authorize?: false, tenant: tenant)
    |> Ash.update!()
  end

  defp hours_from_now(hours) do
    DateTime.add(DateTime.utc_now(), hours, :hour)
  end
end
