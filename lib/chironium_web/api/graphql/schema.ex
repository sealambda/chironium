defmodule ChironiumWeb.Api.Graphql.Schema do
  @moduledoc """
  Absinthe GraphQL schema for Chironium.

  Integrates with AshGraphql to expose Ash resources as GraphQL endpoints.
  """
  use Absinthe.Schema

  use AshGraphql,
    domains: [
      Chironium.Core,
      Chironium.Customers,
      Chironium.Staff,
      Chironium.Core.Identity
    ],
    generate_sdl_file: "priv/schema.graphql"

  import_types Absinthe.Plug.Types

  query do
    field :current_user, :user do
      resolve fn
        _, %{context: %{actor: actor}} when not is_nil(actor) ->
          case Ash.get(Chironium.Core.Identity.User, actor.id,
                 load: [:person],
                 authorize?: false
               ) do
            {:ok, user} -> {:ok, user}
            {:error, error} -> {:error, error}
          end

        _, _ ->
          {:error, "Not authenticated"}
      end
    end
  end

  mutation do
    # Custom Absinthe mutations can be placed here.
  end

  subscription do
    # Custom Absinthe subscriptions can be placed here.
  end
end
