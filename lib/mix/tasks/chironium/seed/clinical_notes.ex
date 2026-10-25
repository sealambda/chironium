defmodule Mix.Tasks.Chironium.Seed.ClinicalNotes do
  @moduledoc "Seed free-text clinical note observations for existing patients in an organization."
  @shortdoc "Seed clinical notes"

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

    Seed.ClinicalNotes.seed(tenant, patients, practitioners)

    Helpers.info("[Seed] Clinical notes created for #{length(patients)} patients.")
  end
end
