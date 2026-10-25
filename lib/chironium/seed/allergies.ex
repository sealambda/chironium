defmodule Chironium.Seed.Allergies do
  @moduledoc "Seed allergy intolerances for existing patients in an organization."

  import Chironium.Generator

  alias Chironium.Seed.Tenant

  @doc "Seed 0–2 allergies and 0–2 intolerances per patient."
  def seed(tenant, patients, practitioners) do
    opts = Tenant.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      seed_allergy_labels()
      |> Enum.take_random(Enum.random(0..2))
      |> Enum.each(fn label ->
        generate(
          allergy_intolerance(
            Keyword.merge(opts,
              patient_id: patient.id,
              type: :allergy,
              code: %{text: label},
              actor: Enum.random(practitioners)
            )
          )
        )
      end)

      seed_intolerance_labels()
      |> Enum.take_random(Enum.random(0..2))
      |> Enum.each(fn label ->
        generate(
          allergy_intolerance(
            Keyword.merge(opts,
              patient_id: patient.id,
              type: :intolerance,
              code: %{text: label},
              actor: Enum.random(practitioners)
            )
          )
        )
      end)
    end)
  end
end
