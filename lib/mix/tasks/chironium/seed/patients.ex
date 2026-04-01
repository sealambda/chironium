defmodule Mix.Tasks.Chironium.Seed.Patients do
  @moduledoc "Seed patients (with person records) into an existing organization."
  @shortdoc "Seed patients"

  use Mix.Task

  import Chironium.Generator

  alias Mix.Tasks.Chironium.Seed.Helpers

  @default_count 50

  @impl true
  def run(args) do
    {tenant, opts} = Helpers.parse_tenant!(args)
    count = Keyword.get(opts, :count, @default_count)

    Helpers.ensure_started!()
    patients = seed(tenant, count)

    Helpers.info("[Seed] #{length(patients)} patients created.")
  end

  @doc "Seed `count` patients with person records. Returns the list of created patients."
  def seed(tenant, count \\ @default_count) do
    generate_many(patient_with_person(Helpers.ash_opts(tenant)), count)
  end
end
