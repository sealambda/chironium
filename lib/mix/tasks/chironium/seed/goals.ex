defmodule Mix.Tasks.Chironium.Seed.Goals do
  @moduledoc "Seed goals for existing patients in an organization."
  @shortdoc "Seed goals"

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

    Seed.Goals.seed(tenant, patients, practitioners)

    Helpers.info("[Seed] Goals created for #{length(patients)} patients.")
  end
end
