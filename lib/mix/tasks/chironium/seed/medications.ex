defmodule Mix.Tasks.Chironium.Seed.Medications do
  @moduledoc "Seed medication statements for existing patients in an organization."
  @shortdoc "Seed medications"

  use Mix.Task

  import Chironium.Generator

  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Helpers.fetch_patients!(tenant)

    seed(tenant, patients)

    Helpers.info("[Seed] Medications created for #{length(patients)} patients.")
  end

  @doc "Seed 0–3 medication statements per patient."
  def seed(tenant, patients) do
    opts = Helpers.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      for _ <- 1..Enum.random(0..3) do
        generate(medication_statement(Keyword.merge(opts, subject_id: patient.id)))
      end
    end)
  end
end
