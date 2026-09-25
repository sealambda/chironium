defmodule Chironium.Health.Task.Changes.RevokeQuestionnaireLinks do
  @moduledoc """
  Revokes a task's links and sessions after it is saved. A no-op for tasks
  that were never sent as a questionnaire request.
  """

  use Ash.Resource.Change

  alias Chironium.Health.QuestionnaireRequests

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.after_action(changeset, fn _changeset, task ->
      if task.focus_questionnaire_id, do: QuestionnaireRequests.revoke_links(task)
      {:ok, task}
    end)
  end
end
