defmodule Mix.Tasks.Chironium.Seed.Questionnaires do
  @moduledoc """
  Seed a "Weekly nutrition check-in" questionnaire and a few completed responses per patient.

  The responses use the exact LOINC + UCUM the anthropometry/cycle cards expect, so the
  extracted observations show up in those cards.
  """
  @shortdoc "Seed questionnaires and responses"

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

    Seed.Questionnaires.seed(tenant, patients, practitioners)

    Helpers.info("[Seed] Weekly check-in seeded with responses for #{length(patients)} patients.")
  end
end
