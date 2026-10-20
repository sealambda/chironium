defmodule Chironium.Health.PendingTasksTest do
  use Chironium.DataCase, async: false

  import Chironium.QuestionnaireRequestFixtures

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

  test "lists overdue and link-expired questionnaires and due reminders, oldest first", ctx do
    overdue = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
    set_period!(ctx, overdue, %{"start" => ago(5, :day), "end" => ago(1, :day)})

    link_expired = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
    set_period!(ctx, link_expired, %{"start" => ago(10, :day)})
    expire_link!(ctx, link_expired)

    due_reminder = reminder(ctx, ctx.patient, ago(1, :hour))

    assert ids(pending(ctx, ctx.practitioner)) == [link_expired.id, overdue.id, due_reminder.id]
  end

  test "excludes open links without a due date, items not yet due, and closed items", ctx do
    _open_link = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)

    _not_yet_due =
      request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire, %{
        due_at: DateTime.add(DateTime.utc_now(), 2, :day)
      })

    _future_reminder = reminder(ctx, ctx.patient, DateTime.add(DateTime.utc_now(), 1, :day))

    completed_reminder = reminder(ctx, ctx.patient, ago(1, :day))
    set_status!(ctx, completed_reminder, :completed)

    cancelled_reminder = reminder(ctx, ctx.patient, ago(1, :day))
    set_status!(ctx, cancelled_reminder, :cancelled)

    cancelled_request = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
    expire_link!(ctx, cancelled_request)
    set_status!(ctx, cancelled_request, :cancelled)

    completed_request = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
    {_claimed, patient} = open_link(completed_request)
    {:ok, _response} = submit(ctx, patient, completed_request)
    set_period!(ctx, completed_request, %{"start" => ago(5, :day), "end" => ago(1, :day)})

    # An opened request is still open, so it shows once it is overdue.
    opened = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
    open_link(opened)
    set_period!(ctx, opened, %{"start" => ago(5, :day), "end" => ago(1, :day)})

    assert [%{status: :in_progress} = listed] = pending(ctx, ctx.practitioner)
    assert listed.id == opened.id
  end

  test "a practitioner sees only their care teams' patients; a power user sees all", ctx do
    other_patient = patient(ctx, nil)
    _other_practitioner = practitioner_actor(ctx, other_patient)

    mine = reminder(ctx, ctx.patient, ago(1, :hour))
    theirs = reminder(ctx, other_patient, ago(2, :hour))

    assert ids(pending(ctx, ctx.practitioner)) == [mine.id]
    assert ids(pending(ctx, ctx.owner)) == [theirs.id, mine.id]
  end

  test "a patient sees nothing, not even their own overdue request", ctx do
    task = request!(ctx, ctx.practitioner, ctx.patient, ctx.questionnaire)
    set_period!(ctx, task, %{"start" => ago(5, :day), "end" => ago(1, :day)})
    {_claimed, patient} = open_link(task)

    assert [%{id: id}] = Ash.read!(Task, actor: patient, tenant: ctx.tenant, page: false)
    assert id == task.id
    # Reads filter to nothing instead of raising when a policy can't pass.
    assert pending(ctx, patient) == []
  end

  defp pending(ctx, actor) do
    Task
    |> Ash.Query.for_read(:pending, %{}, actor: actor, tenant: ctx.tenant)
    |> Ash.read!()
  end

  defp ids(tasks), do: Enum.map(tasks, & &1.id)

  defp ago(amount, unit), do: DateTime.add(DateTime.utc_now(), -amount, unit)

  defp reminder(ctx, patient, start) do
    task =
      Task
      |> Ash.Changeset.for_create(
        :create,
        %{
          intent: :order,
          description: "Call back",
          for_patient_id: patient.id,
          requested_period: %{start: start}
        },
        authorize?: false,
        tenant: ctx.tenant
      )
      |> Ash.create!()

    set_status!(ctx, task, :ready)
    task
  end

  defp set_period!(ctx, task, period), do: update!(ctx, task, "requested_period", period)

  defp set_status!(ctx, task, status), do: update!(ctx, task, "status", to_string(status))

  defp expire_link!(ctx, task),
    do: update!(ctx, task, "access_expires_at", ago(1, :minute))

  defp update!(ctx, task, column, value) do
    Chironium.Repo.query!(
      ~s(UPDATE "#{ctx.tenant}".tasks SET #{column} = $1 WHERE id = $2),
      [value, Ecto.UUID.dump!(task.id)]
    )
  end
end
