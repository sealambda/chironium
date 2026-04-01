defmodule Chironium.Accounts.Authorization do
  @moduledoc """
  Organization-level access control.

  Checked once at the boundary (SetTenant plug). Tenant-scoped resources
  rely on Ash policies and preparations instead of re-checking here.
  """

  require Ash.Query

  @tenant_prefix "org_"

  def organization_id_from_tenant(@tenant_prefix <> organization_id), do: {:ok, organization_id}
  def organization_id_from_tenant(_), do: :error

  @doc """
  Resolves the user's access level to the organization in a single pass.

  Returns `{:ok, :power_user}` for org owners and power_user-role members,
  `{:ok, :member}` for regular members, or `:error` if the user has no access.

  Checks ownership first (1 query), then falls back to a single membership
  lookup (1 more query) — at most 2 DB round-trips.
  """
  def resolve_access(user_id, organization_id) do
    # Owners don't need an OrganizationUsers record.
    if organization_owner?(user_id, organization_id) do
      {:ok, :power_user}
    else
      case get_membership(user_id, organization_id) do
        {:ok, %{role: :power_user}} -> {:ok, :power_user}
        {:ok, _membership} -> {:ok, :member}
        _ -> :error
      end
    end
  end

  @doc "Whether the user may enter this organization at all."
  def organization_accessible?(user_id, organization_id) do
    resolve_access(user_id, organization_id) != :error
  end

  @doc "Whether the user holds an elevated role within the organization."
  def power_user?(user_id, organization_id) do
    resolve_access(user_id, organization_id) == {:ok, :power_user}
  end

  defp get_membership(user_id, organization_id) do
    Chironium.Accounts.OrganizationUsers
    |> Ash.Query.filter(user_id: user_id, organization_id: organization_id)
    |> Ash.read_one(authorize?: false)
    |> case do
      {:ok, nil} -> :not_found
      {:ok, membership} -> {:ok, membership}
      _ -> :error
    end
  end

  defp organization_owner?(user_id, organization_id) do
    Chironium.Accounts.Organization
    |> Ash.Query.filter(id: organization_id, owner_id: user_id)
    |> Ash.read_one(authorize?: false)
    |> case do
      {:ok, nil} -> false
      {:ok, _organization} -> true
      _ -> false
    end
  end
end
