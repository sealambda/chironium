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
        due_date = due_date(task.requested_period)

        Ash.Changeset.force_change_attribute(
          changeset,
          :access_expires_at,
          QuestionnaireRequests.access_expires_at(due_date)
        )
    end
  end

  # A due date that has passed no longer extends the window.
  defp due_date(%{end: %DateTime{} = due}) do
    date = DateTime.to_date(due)
    if Date.compare(date, Date.utc_today()) == :lt, do: nil, else: date
  end

  defp due_date(_), do: nil
end
