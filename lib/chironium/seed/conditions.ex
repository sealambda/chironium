defmodule Chironium.Seed.Conditions do
  @moduledoc "Seed conditions for existing patients in an organization."

  import Chironium.Generator

  alias Chironium.Seed.Tenant

  @doc "Seed 1–4 conditions per patient."
  def seed(tenant, patients, practitioners) do
    opts = Tenant.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      seed_condition_codes()
      |> Enum.take_random(Enum.random(1..4))
      |> Enum.each(fn code ->
        generate(
          condition(
            Keyword.merge(opts,
              subject_id: patient.id,
              code: code,
              actor: Enum.random(practitioners)
            )
          )
        )
      end)
    end)
  end
end
