defmodule Mix.Tasks.Chironium.Seed.Conditions do
  @moduledoc "Seed conditions for existing patients in an organization."
  @shortdoc "Seed conditions"

  use Mix.Task

  import Chironium.Generator

  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Helpers.fetch_patients!(tenant)

    seed(tenant, patients)

    Helpers.info("[Seed] Conditions created for #{length(patients)} patients.")
  end

  @doc "Seed 1–4 conditions per patient."
  def seed(tenant, patients) do
    opts = Helpers.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      for _ <- 1..Enum.random(1..4) do
        generate(condition(Keyword.merge(opts, subject_id: patient.id)))
      end
    end)
  end
end
