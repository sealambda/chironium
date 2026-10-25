defmodule Mix.Tasks.Chironium.Seed.Medications do
  @moduledoc "Seed medication statements and prescriptions for existing patients in an organization."
  @shortdoc "Seed medications"

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

    Seed.Medications.seed(tenant, patients, practitioners)

    Helpers.info("[Seed] Medications created for #{length(patients)} patients.")
  end
end
