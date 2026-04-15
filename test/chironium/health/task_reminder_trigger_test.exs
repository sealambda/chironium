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

  # -- Helpers ---------------------------------------------------------------

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
