defmodule Mix.Tasks.Chironium.Seed.Allergies do
  @moduledoc "Seed allergy intolerances for existing patients in an organization."
  @shortdoc "Seed allergies and intolerances"

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

    Seed.Allergies.seed(tenant, patients, practitioners)

    Helpers.info("[Seed] Allergies created for #{length(patients)} patients.")
  end
end
