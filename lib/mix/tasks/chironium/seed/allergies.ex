defmodule Mix.Tasks.Chironium.Seed.Allergies do
  @moduledoc "Seed allergy intolerances for existing patients in an organization."
  @shortdoc "Seed allergies and intolerances"

  use Mix.Task

  import Chironium.Generator

  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Helpers.fetch_patients!(tenant)
    practitioners = Helpers.fetch_practitioners!(tenant)

    seed(tenant, patients, practitioners)

    Helpers.info("[Seed] Allergies created for #{length(patients)} patients.")
  end

  @doc "Seed 0–2 allergies and 0–2 intolerances per patient."
  def seed(tenant, patients, practitioners) do
    opts = Helpers.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      seed_allergy_labels()
      |> Enum.take_random(Enum.random(0..2))
      |> Enum.each(fn label ->
        generate(allergy_intolerance(Keyword.merge(opts, patient_id: patient.id, type: :allergy, code: %{text: label}, actor: Enum.random(practitioners))))
      end)

      seed_intolerance_labels()
      |> Enum.take_random(Enum.random(0..2))
      |> Enum.each(fn label ->
        generate(allergy_intolerance(Keyword.merge(opts, patient_id: patient.id, type: :intolerance, code: %{text: label}, actor: Enum.random(practitioners))))
      end)
    end)
  end
end
