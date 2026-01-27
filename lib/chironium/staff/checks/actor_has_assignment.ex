defmodule Chironium.Staff.Checks.ActorHasAssignment do
  @moduledoc """
  Policy check that verifies the actor has an active STAFF contract
  and an active assignment to the membership being accessed.

  Active assignment means the assignment's end_date is nil or >= today.
  The actor is expected to be a `User` resource with a `person_id` field.
  """
  use Ash.Policy.SimpleCheck

  require Logger
  require Ash.Query
  import Ash.Expr

  @impl true
  @spec describe(keyword()) :: String.t()
  def describe(_opts) do
    "actor has active assignment to the membership"
  end

  @impl true
  @spec match?(Ash.Resource.record() | nil, map(), keyword()) :: boolean()
  def match?(nil, _context, _opts), do: false

  # For query context (list/read operations).
  def match?(actor, %{query: query}, _opts) do
    person_id = get_person_id(actor)
    org_id = query.tenant

    case {person_id, org_id} do
      {nil, _} -> false
      {_, nil} -> false
      {person_id, org_id} -> has_active_assignment?(person_id, org_id)
    end
  end

  # For changeset context (individual record access).
  def match?(actor, %{changeset: changeset}, _opts) do
    person_id = get_person_id(actor)
    membership_id = get_membership_id(changeset)
    org_id = get_organisation_id(changeset)

    case {person_id, membership_id, org_id} do
      {nil, _, _} ->
        false

      {_, nil, _} ->
        false

      {_, _, nil} ->
        false

      {person_id, membership_id, org_id} ->
        has_assignment_to_membership?(person_id, membership_id, org_id)
    end
  end

  def match?(_actor, _context, _opts), do: false

  # Extract person_id from actor (User has person_id field).
  @spec get_person_id(Ash.Resource.record()) :: Ash.UUID.t() | nil
  defp get_person_id(%{person_id: person_id}) when not is_nil(person_id), do: person_id
  defp get_person_id(_), do: nil

  @spec get_membership_id(Ash.Changeset.t()) :: Ash.UUID.t() | nil
  defp get_membership_id(changeset) do
    Ash.Changeset.get_attribute(changeset, :id) ||
      case changeset.data do
        %{id: id} when not is_nil(id) -> id
        _ -> nil
      end
  end

  @spec get_organisation_id(Ash.Changeset.t()) :: Ash.UUID.t() | nil
  defp get_organisation_id(changeset) do
    Ash.Changeset.get_attribute(changeset, :organisation_id) ||
      case changeset.data do
        %{organisation_id: org_id} when not is_nil(org_id) -> org_id
        _ -> nil
      end
  end

  # Check if actor has any active assignment in the org (for list queries).
  @spec has_active_assignment?(Ash.UUID.t(), Ash.UUID.t()) :: boolean()
  defp has_active_assignment?(actor_person_id, target_org_id) do
    today = Date.utc_today()

    Chironium.Services.Assignment
    |> Ash.Query.for_read(:read)
    |> Ash.Query.filter(expr(organisation_id == ^target_org_id))
    |> Ash.Query.filter(
      expr(
        exists(
          contract,
          person_id == ^actor_person_id and status in [:ACTIVE, :PAUSED] and role == :STAFF
        )
      )
    )
    |> Ash.Query.filter(expr(is_nil(end_date) or end_date >= ^today))
    |> Ash.exists?(authorize?: false)
  rescue
    error ->
      Logger.warning("ActorHasAssignment: Query failed - #{inspect(error)}")
      false
  end

  # Check if actor has assignment to specific membership.
  @spec has_assignment_to_membership?(Ash.UUID.t(), Ash.UUID.t(), Ash.UUID.t()) :: boolean()
  defp has_assignment_to_membership?(actor_person_id, membership_id, target_org_id) do
    today = Date.utc_today()

    Chironium.Services.Assignment
    |> Ash.Query.for_read(:read)
    |> Ash.Query.filter(expr(membership_id == ^membership_id))
    |> Ash.Query.filter(expr(organisation_id == ^target_org_id))
    |> Ash.Query.filter(
      expr(
        exists(
          contract,
          person_id == ^actor_person_id and status in [:ACTIVE, :PAUSED] and role == :STAFF
        )
      )
    )
    |> Ash.Query.filter(expr(is_nil(end_date) or end_date >= ^today))
    |> Ash.exists?(authorize?: false)
  rescue
    error ->
      Logger.warning("ActorHasAssignment: Query failed - #{inspect(error)}")
      false
  end
end
