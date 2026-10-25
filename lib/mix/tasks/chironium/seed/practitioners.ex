defmodule Mix.Tasks.Chironium.Seed.Practitioners do
  @moduledoc "Seed practitioners into an existing organization."
  @shortdoc "Seed practitioners"

  use Mix.Task

  alias Chironium.Seed
  alias Mix.Tasks.Chironium.Seed.Helpers

  @default_count 10

  @impl true
  def run(args) do
    {tenant, opts} = Helpers.parse_tenant!(args)
    count = Keyword.get(opts, :count, @default_count)

    Helpers.ensure_started!()
    practitioners = Seed.Practitioners.seed(tenant, count)

    Helpers.info("[Seed] #{length(practitioners)} practitioners created.")
  end
end
