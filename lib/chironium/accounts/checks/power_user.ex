defmodule Chironium.Accounts.Checks.PowerUser do
  @moduledoc """
  Authorizes actors that hold an elevated role within the current organization.

  Org owners and members with `power_user` role pass this check. Intended for
  use as a `bypass` so that power users skip finer-grained visibility filters.
  """

  use Ash.Policy.SimpleCheck

  alias Chironium.Accounts.Authorization

  @impl true
  def describe(_opts), do: "actor is a power user in the current organization"

  @impl true
  def match?(%Chironium.Accounts.User{id: user_id}, %{resource: resource} = context, _opts) do
    # Fast path: use the access level resolved once by SetTenant and stored in Ash context.
    case access_level_from_context(context) do
      :power_user ->
        true

      _ ->
        # Fallback for direct Ash calls (tests, background jobs) that bypass the plug.
        case resolve_organization_id(context, resource) do
          {:ok, organization_id} -> Authorization.power_user?(user_id, organization_id)
          _ -> false
        end
    end
  end

  def match?(_, _, _), do: false

  defp resolve_organization_id(context, resource) do
    tenant = tenant_from(context, resource)

    case Authorization.organization_id_from_tenant(tenant) do
      {:ok, _} = ok ->
        ok

      _ ->
        # When acting directly on an Organization resource (e.g., invite_users in tests),
        # extract the org ID from the record being modified instead of the tenant.
        organization_id_from_data(context)
    end
  end

  defp organization_id_from_data(%{
         changeset: %{data: %Chironium.Accounts.Organization{id: id}}
       })
       when not is_nil(id),
       do: {:ok, id}

  defp organization_id_from_data(%{
         changeset: %{data: %Chironium.Accounts.OrganizationUsers{organization_id: id}}
       })
       when not is_nil(id),
       do: {:ok, id}

  defp organization_id_from_data(_), do: :error

  defp access_level_from_context(%{query: query}) when not is_nil(query) do
    query.context[:access_level]
  end

  defp access_level_from_context(%{changeset: changeset}) when not is_nil(changeset) do
    changeset.context[:access_level]
  end

  defp access_level_from_context(_), do: nil

  defp tenant_from(%{query: %{tenant: tenant}}, _resource) when not is_nil(tenant), do: tenant

  defp tenant_from(%{changeset: %{tenant: tenant}}, _resource) when not is_nil(tenant),
    do: tenant

  defp tenant_from(_, _), do: nil
end
