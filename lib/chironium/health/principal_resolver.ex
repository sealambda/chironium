defmodule Chironium.Health.PrincipalResolver do
  @moduledoc """
  Resolves `:practitioner` principal grants into `%Practitioner{}` actors.

  Implements `Chironium.Accounts.PrincipalResolver` so the Accounts domain
  can resolve practitioners without depending on the Health domain directly.
  """

  @behaviour Chironium.Accounts.PrincipalResolver

  @impl true
  def resolve(principal_id, all_ids, user, tenant) do
    case Ash.get(Chironium.Health.Practitioner, principal_id,
           authorize?: false,
           tenant: tenant
         ) do
      {:ok, practitioner} ->
        {:ok,
         practitioner
         |> Ash.Resource.put_metadata(:user, user)
         |> Ash.Resource.put_metadata(:practitioner_ids, all_ids)}

      _error ->
        :error
    end
  end
end
