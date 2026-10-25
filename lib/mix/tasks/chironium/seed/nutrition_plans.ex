defmodule Mix.Tasks.Chironium.Seed.NutritionPlans do
  @moduledoc "Seed nutrition plans for existing patients in an organization."
  @shortdoc "Seed nutrition plans"

  use Mix.Task

  alias Chironium.Seed
  alias Chironium.Seed.Tenant
  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Tenant.fetch_patients!(tenant)

    Seed.NutritionPlans.seed(tenant, patients)

    Helpers.info("[Seed] Nutrition plans created for #{length(patients)} patients.")
  end
end
