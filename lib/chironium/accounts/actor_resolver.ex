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

  Looks up the user's active `PrincipalGrant` records of the requested types
  and delegates to the matching `PrincipalResolver`. Falls back to the
  original `%User{}` when no resolver succeeds.

  ## Options

    * `:principal_types` (required) - the principal types to consider, in
      order of preference. Each endpoint passes only the types it serves, so a
      user who is both Patient and Practitioner never resolves to the wrong
      role.
  """
  def resolve(user, tenant, opts) do
    principal_types = Keyword.fetch!(opts, :principal_types)
    grants = active_grants(user.id, principal_types, tenant)

    case grants do
      [] ->
        user

      _ ->
        resolve_from_grants(grants, principal_types, user, tenant)
    end
  end

  defp resolve_from_grants(grants, principal_types, user, tenant) do
    resolvers = principal_resolvers()
    grants_by_type = Enum.group_by(grants, & &1.principal_type)

    Enum.find_value(principal_types, fn type ->
      with resolver when not is_nil(resolver) <- Map.get(resolvers, type),
           [_ | _] = type_grants <- Map.get(grants_by_type, type, []) do
        ids = Enum.map(type_grants, & &1.principal_id)
        try_resolve(resolver, ids, ids, user, tenant)
      else
        _ -> nil
      end
    end) || user
  end

  # Try each principal ID in order until a resolver succeeds.
  defp try_resolve(_resolver, [], _all_ids, _user, _tenant), do: nil

  defp try_resolve(resolver, [id | rest], all_ids, user, tenant) do
    case resolver.resolve(id, all_ids, user, tenant) do
      {:ok, principal} -> principal
      :error -> try_resolve(resolver, rest, all_ids, user, tenant)
    end
  end

  defp active_grants(user_id, principal_types, tenant) do
    Chironium.Accounts.PrincipalGrant
    |> Ash.Query.filter(
      user_id == ^user_id and active == true and principal_type in ^principal_types
    )
    |> Ash.read!(authorize?: false, tenant: tenant)
  end

  defp principal_resolvers do
    :chironium
    |> Application.get_env(__MODULE__, [])
    |> Keyword.get(:principal_resolvers, %{})
  end
end
