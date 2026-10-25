defmodule Chironium.Seed.Practitioners do
  @moduledoc "Seed practitioners into an existing organization."

  import Chironium.Generator

  alias Chironium.Seed.Tenant

  @default_count 10

  @doc "Seed `count` practitioners. Returns the list of created practitioners."
  def seed(tenant, count \\ @default_count) do
    generate_many(practitioner(Tenant.ash_opts(tenant)), count)
  end
end
