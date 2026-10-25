defmodule Mix.Tasks.Chironium.Seed.CareTeams do
  @moduledoc "Seed care teams linking existing patients and practitioners in an organization."
  @shortdoc "Seed care teams"

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

    Seed.CareTeams.seed(tenant, patients, practitioners)

    Helpers.info("[Seed] Care teams created for #{length(patients)} patients.")
  end
end
