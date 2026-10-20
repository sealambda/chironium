defmodule Chironium.Health.Task.Changes.ReissueQuestionnaireLink do
  @moduledoc """
  Prepares a new access window for a questionnaire request that is still open.
  `IssueQuestionnaireLinks` then replaces the old links.
  """

  use Ash.Resource.Change

  alias Chironium.Health.Checks.TaskVisibleToPatient
  alias Chironium.Health.QuestionnaireRequests

  @impl true
  def change(changeset, _opts, _context) do
    task = changeset.data

    cond do
      is_nil(task.focus_questionnaire_id) ->
        Ash.Changeset.add_error(changeset,
          message: "Task #{task.id} is not a questionnaire request."
        )

      task.status not in TaskVisibleToPatient.open_statuses() ->
        Ash.Changeset.add_error(changeset,
          message: "Task #{task.id} is #{task.status}; only open requests get a new link."
        )

      true ->
        now = DateTime.utc_now()

        Ash.Changeset.force_change_attribute(
          changeset,
          :access_expires_at,
          QuestionnaireRequests.access_expires_at(
            upcoming_due_at(task.requested_period, now),
            now
          )
        )
    end
  end

  # A due date that has passed no longer extends the window.
  defp upcoming_due_at(%{end: %DateTime{} = due_at}, now) do
    if DateTime.compare(due_at, now) == :gt, do: due_at
  end

  defp upcoming_due_at(_period, _now), do: nil
end
