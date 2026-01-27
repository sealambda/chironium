defmodule Chironium.Core.Checks.ActorIsAdmin do
  @moduledoc """
  Policy check that verifies the actor has an ADMIN role.

  This is an app-wide system role stored on the Person resource.
  It is independent of organisation-scoped contract roles.
  ADMIN users have full access to create/update/destroy organisations
  and can see all organisations regardless of their contracts.

  The actor is expected to be a `User` resource with a `person_id` field.
  """
  use Ash.Policy.SimpleCheck

  require Logger

  @impl true
  @spec describe(keyword()) :: String.t()
  def describe(_opts) do
    "actor has ADMIN role"
  end

  @impl true
  @spec match?(Ash.Resource.record() | nil, map(), keyword()) :: boolean()
  def match?(nil, _context, _opts), do: false

  def match?(actor, _context, _opts) do
    case get_person_id(actor) do
      nil ->
        false

      person_id ->
        admin?(person_id)
    end
  end

  # Extract person_id from actor (User has person_id field).
  @spec get_person_id(Ash.Resource.record()) :: Ash.UUID.t() | nil
  defp get_person_id(%{person_id: person_id}) when not is_nil(person_id), do: person_id
  defp get_person_id(_), do: nil

  @spec admin?(Ash.UUID.t()) :: boolean()
  defp admin?(person_id) do
    case Ash.get(Chironium.Core.Person, person_id, authorize?: false) do
      {:ok, %{role: :ADMIN}} -> true
      _ -> false
    end
  rescue
    error ->
      Logger.warning("ActorIsAdmin: Query failed - #{inspect(error)}")
      false
  end
end
