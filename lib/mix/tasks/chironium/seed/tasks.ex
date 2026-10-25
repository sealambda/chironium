defmodule Mix.Tasks.Chironium.Seed.Tasks do
  @moduledoc "Seed tasks for existing patients in an organization."
  @shortdoc "Seed tasks"

  use Mix.Task

  alias Chironium.Seed
  alias Chironium.Seed.Tenant
  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Tenant.fetch_patients!(tenant)
    practitioners = Tenant.fetch_practitioners!(tenant)

    Seed.Tasks.seed(tenant, patients, practitioners)

    Helpers.info("[Seed] Tasks created for #{length(patients)} patients.")
  end
end
