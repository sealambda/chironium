defmodule Mix.Tasks.Chironium.Seed.NutritionPlans do
  @moduledoc "Seed nutrition plans for existing patients in an organization."
  @shortdoc "Seed nutrition plans"

  use Mix.Task

  import Chironium.Generator

  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Helpers.fetch_patients!(tenant)

    seed(tenant, patients)

    Helpers.info("[Seed] Nutrition plans created for #{length(patients)} patients.")
  end

  @doc "Seed 0–2 nutrition plans per patient."
  def seed(tenant, patients) do
    opts = Helpers.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      for _ <- 1..Enum.random(0..2) do
        generate(nutrition_plan(Keyword.merge(opts, patient_id: patient.id)))
      end
    end)
  end
end
