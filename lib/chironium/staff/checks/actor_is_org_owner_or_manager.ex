defmodule Chironium.Staff.Checks.ActorIsOrgOwnerOrManager do
  @moduledoc """
  Policy check that verifies the actor is an OWNER or MANAGER
  of the organisation being accessed.

  The actor is expected to be a `User` resource with a `person_id` field.
  This check is used for authorizing contract creation and state transitions.
  Only people with an active (ACTIVE or PAUSED) contract with OWNER or MANAGER
  role in the target organisation are allowed.
  """
  use Ash.Policy.SimpleCheck

  require Logger
  require Ash.Query
  import Ash.Expr

  @management_roles [:OWNER, :MANAGER]
  @active_statuses [:ACTIVE, :PAUSED]

  @impl true
  @spec describe(keyword()) :: String.t()
  def describe(_opts) do
    "actor is owner or manager of the organisation"
  end

  @impl true
  @spec match?(Ash.Resource.record() | nil, map(), keyword()) :: boolean()
  def match?(nil, _context, _opts), do: false

  def match?(actor, %{changeset: changeset}, _opts) do
    case get_organisation_id(changeset) do
      nil ->
        Logger.debug("ActorIsOrgOwnerOrManager: No organisation_id found in changeset")
        false

      org_id ->
        has_management_role?(get_person_id(actor), org_id)
    end
  end

  # Handle query context (for read policies).
  def match?(actor, %{query: query}, _opts) do
    # For queries, try to get org from query arguments or tenant.
    org_id = Ash.Query.get_argument(query, :organisation_id) || query.tenant

    case org_id do
      nil -> false
      org_id -> has_management_role?(get_person_id(actor), org_id)
    end
  end

  def match?(_actor, _context, _opts), do: false

  # Extract person_id from actor (User has person_id field).
  @spec get_person_id(Ash.Resource.record()) :: Ash.UUID.t() | nil
  defp get_person_id(%{person_id: person_id}) when not is_nil(person_id), do: person_id
  defp get_person_id(_), do: nil

  @spec get_organisation_id(Ash.Changeset.t()) :: Ash.UUID.t() | nil
  defp get_organisation_id(changeset) do
    # Try to get from changeset attributes first (for creates).
    # For updates, get from the record being updated.
    Ash.Changeset.get_attribute(changeset, :organisation_id) ||
      case changeset.data do
        %{organisation_id: org_id} when not is_nil(org_id) -> org_id
        _ -> nil
      end
  end

  @spec has_management_role?(Ash.UUID.t() | nil, Ash.UUID.t()) :: boolean()
  defp has_management_role?(nil, _target_org_id), do: false

  defp has_management_role?(actor_person_id, target_org_id) do
    Chironium.Staff.Contract
    |> Ash.Query.for_read(:read)
    |> Ash.Query.filter(expr(person_id == ^actor_person_id))
    |> Ash.Query.filter(expr(organisation_id == ^target_org_id))
    |> Ash.Query.filter(expr(role in ^@management_roles))
    |> Ash.Query.filter(expr(status in ^@active_statuses))
    |> Ash.exists?(authorize?: false)
  rescue
    error ->
      Logger.warning("ActorIsOrgOwnerOrManager: Query failed - #{inspect(error)}")
      false
  end
end
