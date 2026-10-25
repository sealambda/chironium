defmodule Chironium.Seed.Goals do
  @moduledoc "Seed goals for existing patients in an organization."

  import Chironium.Generator

  alias Chironium.Seed.Tenant

  @doc "Seed 1–3 goals per patient."
  def seed(tenant, patients, practitioners) do
    opts = Tenant.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      for _ <- 1..Enum.random(1..3) do
        generate(
          goal(Keyword.merge(opts, subject_id: patient.id, actor: Enum.random(practitioners)))
        )
      end
    end)
  end
end
