defmodule Chironium.Accounts.ActorResolver do
  @moduledoc """
  Resolves a User into their domain principal within a tenant.

  Resolution is driven by `PrincipalGrant` records and a registry of
  `PrincipalResolver` implementations configured at

      config :chironium, Chironium.Accounts.ActorResolver,
        principal_resolvers: %{
          practitioner: MyApp.Health.PrincipalResolver,
          ...
        }

  Each downstream domain supplies its own resolver module so that the
  Accounts domain never depends on Health (or any other) domain.
  """

  require Ash.Query

  @doc """
  Resolves a user to their domain actor for the given tenant.

  Looks up active `PrincipalGrant` records, groups them by type, and
  delegates to the first matching `PrincipalResolver`. Falls back to the
  original `%User{}` when no resolver succeeds.
  """
  def resolve(user, tenant) do
    grants = active_grants(user.id, tenant)

    case grants do
      [] ->
        user

      _ ->
        resolve_from_grants(grants, user, tenant)
    end
  end

  defp resolve_from_grants(grants, user, tenant) do
    resolvers = principal_resolvers()

    grants
    |> Enum.group_by(& &1.principal_type)
    |> Enum.find_value(fn {type, type_grants} ->
      case Map.get(resolvers, type) do
        nil ->
          nil

        resolver ->
          ids = Enum.map(type_grants, & &1.principal_id)

          case resolver.resolve(hd(ids), ids, user, tenant) do
            {:ok, principal} -> principal
            :error -> nil
          end
      end
    end) || user
  end

  defp active_grants(user_id, tenant) do
    Chironium.Accounts.PrincipalGrant
    |> Ash.Query.filter(user_id: user_id, active: true)
    |> Ash.read!(authorize?: false, tenant: tenant)
  end

  defp principal_resolvers do
    :chironium
    |> Application.get_env(__MODULE__, [])
    |> Keyword.get(:principal_resolvers, %{})
  end
end
