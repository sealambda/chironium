defmodule Mix.Tasks.Chironium.Seed.Medications do
  @moduledoc "Seed medication statements and prescriptions for existing patients in an organization."
  @shortdoc "Seed medications"

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

    Helpers.info("[Seed] Medications created for #{length(patients)} patients.")
  end

  @doc """
  Seed each patient with 0–3 pre-existing medication statements and 0–2
  practitioner-prescribed medication requests.
  """
  def seed(tenant, patients, practitioners) do
    opts = Helpers.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      (seed_medication_labels() ++ seed_supplement_labels())
      |> Enum.take_random(Enum.random(0..3))
      |> Enum.each(fn label ->
        generate(medication_statement(Keyword.merge(opts, subject_id: patient.id, medication: %{text: label}, actor: Enum.random(practitioners))))
      end)

      seed_medication_labels()
      |> Enum.take_random(Enum.random(0..2))
      |> Enum.each(fn label ->
        generate(medication_request(Keyword.merge(opts, subject_id: patient.id, medication: %{text: label}, actor: Enum.random(practitioners))))
      end)
    end)
  end
end
