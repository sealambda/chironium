defmodule Chironium.Seed.NutritionPlans do
  @moduledoc "Seed nutrition plans for existing patients in an organization."

  import Chironium.Generator

  alias Chironium.Seed.Tenant

  @doc "Seed 0–2 nutrition plans per patient."
  def seed(tenant, patients) do
    opts = Tenant.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      for _ <- 1..Enum.random(0..2)//1 do
        generate(nutrition_plan(Keyword.merge(opts, patient_id: patient.id)))
      end
    end)
  end
end
