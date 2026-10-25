defmodule Mix.Tasks.Chironium.Seed.Observations do
  @moduledoc "Seed anthropometric observations for existing patients in an organization."
  @shortdoc "Seed observations"

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

    Seed.Observations.seed(tenant, patients, practitioners)

    Helpers.info("[Seed] Observations created for #{length(patients)} patients.")
  end
end
