defmodule Chironium.Health.QuestionnaireResponse.Changes.CompleteRequest do
  @moduledoc """
  Completes the questionnaire request a portal response answers and revokes
  its links, which ends the patient's session. Both run as the patient so the
  audit trail records who made the change.
  """

  use Ash.Resource.Change

  alias Chironium.Health.QuestionnaireRequests
  alias Chironium.Health.Task

  @impl true
  def change(changeset, _opts, context) do
    Ash.Changeset.after_action(changeset, fn changeset, response ->
      opts = [tenant: changeset.tenant, actor: context.actor, authorize?: false]

      with {:ok, task} <- Ash.get(Task, response.task_id, opts),
           {:ok, task} <- task |> Ash.Changeset.for_update(:complete, %{}, opts) |> Ash.update() do
        QuestionnaireRequests.revoke_links(task)
        {:ok, response}
      end
    end)
  end
end
