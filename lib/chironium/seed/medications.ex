defmodule Chironium.Seed.Medications do
  @moduledoc "Seed medication statements and prescriptions for existing patients in an organization."

  import Chironium.Generator

  alias Chironium.Seed.Tenant

  @doc """
  Seed each patient with 0–3 pre-existing medication statements and 0–2
  practitioner-prescribed medication requests.
  """
  def seed(tenant, patients, practitioners) do
    opts = Tenant.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      (seed_medication_labels() ++ seed_supplement_labels())
      |> Enum.take_random(Enum.random(0..3))
      |> Enum.each(fn label ->
        generate(
          medication_statement(
            Keyword.merge(opts,
              subject_id: patient.id,
              medication: %{text: label},
              actor: Enum.random(practitioners)
            )
          )
        )
      end)

      seed_medication_labels()
      |> Enum.take_random(Enum.random(0..2))
      |> Enum.each(fn label ->
        generate(
          medication_request(
            Keyword.merge(opts,
              subject_id: patient.id,
              medication: %{text: label},
              actor: Enum.random(practitioners)
            )
          )
        )
      end)
    end)
  end
end
