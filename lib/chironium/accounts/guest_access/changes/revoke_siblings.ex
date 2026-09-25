defmodule Chironium.Accounts.GuestAccess.Changes.RevokeSiblings do
  @moduledoc """
  Revokes the other accesses issued for the same task once one is claimed, so
  a request gets exactly one session whichever channel was used.
  """

  use Ash.Resource.Change

  require Ash.Query

  alias Chironium.Accounts.GuestAccess

  @impl true
  def change(changeset, _opts, context) do
    Ash.Changeset.after_action(changeset, fn _changeset, claimed ->
      GuestAccess
      |> Ash.Query.filter(task_id == ^claimed.task_id and id != ^claimed.id and is_nil(revoked_at))
      |> Ash.read!(authorize?: false)
      |> Enum.each(&GuestAccess.revoke!(&1, authorize?: false, actor: context.actor))

      {:ok, claimed}
    end)
  end
end
