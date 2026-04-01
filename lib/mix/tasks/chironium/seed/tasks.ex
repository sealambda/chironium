defmodule Mix.Tasks.Chironium.Seed.Tasks do
  @moduledoc "Seed tasks for existing patients in an organization."
  @shortdoc "Seed tasks"

  use Mix.Task

  import Chironium.Generator

  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Helpers.fetch_patients!(tenant)

    seed(tenant, patients)

    Helpers.info("[Seed] Tasks created for #{length(patients)} patients.")
  end

  @doc "Seed 1–5 tasks per patient."
  def seed(tenant, patients) do
    opts = Helpers.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      for _ <- 1..Enum.random(1..5) do
        generate(task(Keyword.merge(opts, for_patient_id: patient.id)))
      end
    end)
  end
end
