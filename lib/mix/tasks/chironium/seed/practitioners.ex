defmodule Mix.Tasks.Chironium.Seed.Practitioners do
  @moduledoc "Seed practitioners into an existing organization."
  @shortdoc "Seed practitioners"

  use Mix.Task

  import Chironium.Generator

  alias Mix.Tasks.Chironium.Seed.Helpers

  @default_count 10

  @impl true
  def run(args) do
    {tenant, opts} = Helpers.parse_tenant!(args)
    count = Keyword.get(opts, :count, @default_count)

    Helpers.ensure_started!()
    practitioners = seed(tenant, count)

    Helpers.info("[Seed] #{length(practitioners)} practitioners created.")
  end

  @doc "Seed `count` practitioners. Returns the list of created practitioners."
  def seed(tenant, count \\ @default_count) do
    generate_many(practitioner(Helpers.ash_opts(tenant)), count)
  end
end
