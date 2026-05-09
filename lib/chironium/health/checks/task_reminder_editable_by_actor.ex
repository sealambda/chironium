defmodule Chironium.Health.Checks.TaskReminderEditableByActor do
  @moduledoc """
  Authorizes reminder edits for actors who can already read the task.

  Reminder edits are limited to pending tasks and reuse the read visibility
  boundary so practitioners may only reschedule reminders for patients in their
  active care teams.
  """

  use Ash.Policy.SimpleCheck

  @impl true
  def describe(_opts), do: "actor can edit the reminder for this pending task"

  @impl true
  def match?(_actor, %{changeset: %{data: %{status: status}}}, _opts)
      when status not in [:ready, :accepted],
      do: false

  def match?(actor, %{changeset: %{data: %{id: task_id}, tenant: tenant}}, _opts)
      when not is_nil(actor) and not is_nil(task_id) and not is_nil(tenant) do
    case Ash.get(Chironium.Health.Task, task_id, actor: actor, tenant: tenant) do
      {:ok, _task} -> true
      _ -> false
    end
  end

  def match?(_, _, _), do: false
end
