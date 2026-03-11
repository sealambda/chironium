defmodule Chironium.BaseResources.Identifiable do
  @moduledoc """
  Base resource for globally shared data stored in the public schema with a UUIDv7 primary key.
  """

  defmacro __using__(opts) do
    quote do
      use Ash.Resource, unquote(opts)

      postgres do
        repo Chironium.Repo
      end

      attributes do
        uuid_v7_primary_key :id
      end
    end
  end
end
