defmodule Mix.Tasks.Chironium.Seed.MenstrualCycles do
  @moduledoc "Seed menstrual cycle observations for existing patients in an organization."
  @shortdoc "Seed menstrual cycles"

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

    Seed.MenstrualCycles.seed(tenant, patients, practitioners)

    Helpers.info("[Seed] Menstrual cycles created for #{length(patients)} patients.")
  end
end
