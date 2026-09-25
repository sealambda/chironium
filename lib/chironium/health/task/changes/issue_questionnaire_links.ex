defmodule Chironium.Health.Task.Changes.IssueQuestionnaireLinks do
  @moduledoc """
  Issues a request's links after it is saved, revoking any earlier ones, and
  returns the shareable URL and whether an email was queued as action metadata.
  """

  use Ash.Resource.Change

  alias Chironium.Health.QuestionnaireRequests

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.after_action(changeset, fn changeset, task ->
      QuestionnaireRequests.revoke_links(task)

      case QuestionnaireRequests.issue_links(task, changeset.tenant) do
        {:ok, %{link_url: link_url, email_sent?: email_sent?}} ->
          {:ok,
           task
           |> Ash.Resource.put_metadata(:link_url, link_url)
           |> Ash.Resource.put_metadata(:email_sent, email_sent?)}

        {:error, message} ->
          {:error, Ash.Error.Unknown.exception(error: message)}
      end
    end)
  end
end
