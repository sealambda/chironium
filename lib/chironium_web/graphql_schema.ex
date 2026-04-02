defmodule ChironiumWeb.GraphqlSchema do
  use Absinthe.Schema

  use AshGraphql,
    domains: [
      Chironium.Accounts,
      Chironium.CRM,
      Chironium.Health,
      Chironium.Subscriptions,
      Chironium.Terminology
    ],
    generate_sdl_file: "priv/schema.graphql",
    auto_generate_sdl_file?: true

  import_types Absinthe.Plug.Types

  query do
    # TODO Return entire scope (actor, tenant, locale, ...)
    # https://hexdocs.pm/ash/Ash.Scope.html

    @desc """
    Retrieve the info for the actor that is currently signed in.
    """
    field :current_actor, :user do
      resolve fn
        _, %{context: %{actor: %Chironium.Accounts.User{} = user}} ->
          {:ok, user}

        _, %{context: %{actor: %{__metadata__: %{user: user}}}} when not is_nil(user) ->
          {:ok, user}

        _, _ ->
          {:error, "Not authenticated"}
      end
    end
  end

  object :money do
    field(:amount, non_null(:decimal))
    field(:currency, non_null(:string))
  end

  input_object :money_input do
    field(:amount, non_null(:decimal))
    field(:currency, non_null(:string))
  end

  input_object :principal_grant_input do
    field(:principal_type, non_null(:principal_type))
    field(:principal_id, non_null(:id))
  end

  mutation do
    # Custom Absinthe mutations can be placed here
  end

  subscription do
    # Custom Absinthe subscriptions can be placed here
  end
end
