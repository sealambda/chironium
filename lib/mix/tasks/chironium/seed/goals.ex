defmodule Mix.Tasks.Chironium.Seed.Goals do
  @moduledoc "Seed goals for existing patients in an organization."
  @shortdoc "Seed goals"

  use Mix.Task

  import Chironium.Generator

  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Helpers.fetch_patients!(tenant)

    seed(tenant, patients)

    Helpers.info("[Seed] Goals created for #{length(patients)} patients.")
  end

  @doc "Seed 1–3 goals per patient."
  def seed(tenant, patients) do
    opts = Helpers.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      for _ <- 1..Enum.random(1..3) do
        generate(goal(Keyword.merge(opts, subject_id: patient.id)))
      end
    end)
  end
end
