defmodule Chironium.Seed.Patients do
  @moduledoc "Seed patients (with person records) into an existing organization."

  import Chironium.Generator

  alias Chironium.Seed.Tenant

  @default_count 50

  @doc "Seed `count` patients with person records. Returns the list of created patients."
  def seed(tenant, count \\ @default_count) do
    generate_many(patient_with_person(Tenant.ash_opts(tenant)), count)
  end
end
