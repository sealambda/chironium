defmodule Chironium.Accounts.Validations.PrincipalExistsInOrg do
  @moduledoc """
  Validates that the `principal_type` + `principal_id` pair on a `PrincipalGrant`
  changeset references a record that actually exists within the current tenant.

  Implemented as an `Ash.Resource.Change` using a `before_action` hook.
  `PrincipalGrant` is always tenant-scoped, so `changeset.tenant` is set by the
  time this hook runs, giving us the correct organization context automatically.

  Applied only to the `PrincipalGrant.create` action (not `link_to_user`) because
  invitation-linked grants are already validated at invite-creation time.
  """

  use Ash.Resource.Change

  require Ash.Query

  @impl Ash.Resource.Change
  def change(changeset, _opts, _context) do
    Ash.Changeset.before_action(changeset, fn cs ->
      type = Ash.Changeset.get_attribute(cs, :principal_type)
      id = Ash.Changeset.get_attribute(cs, :principal_id)

      case check_principal(cs.tenant, type, id) do
        :ok -> cs
        {:error, error} -> Ash.Changeset.add_error(cs, error)
      end
    end)
  end

  defp check_principal(tenant, type, id) do
    # The enum type guarantees only valid principal types reach this point.
    resource = Chironium.Accounts.PrincipalType.resource_for!(type)
    query = Ash.Query.filter(resource, id == ^id)

    case Ash.read_one(query, authorize?: false, tenant: tenant) do
      {:ok, nil} ->
        {:error,
         field: :principal_id,
         message: "no #{type} with that ID exists in this organization"}

      {:ok, _} ->
        :ok

      {:error, _} ->
        {:error, field: :principal_id, message: "could not verify #{type} existence"}
    end
  end
end
