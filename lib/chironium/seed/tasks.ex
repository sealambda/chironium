defmodule Chironium.Seed.Tasks do
  @moduledoc "Seed tasks for existing patients in an organization."

  import Chironium.Generator

  alias Chironium.Seed.Tenant

  @doc "Seed 1–5 tasks per patient."
  def seed(tenant, patients, practitioners) do
    opts = Tenant.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      for _ <- 1..Enum.random(1..5) do
        actor = Enum.random(practitioners)
        task = generate(task(Keyword.merge(opts, for_patient_id: patient.id, actor: actor)))
        # The app readies a reminder right after creating it; the pending list skips drafts.
        Ash.update!(task, %{}, Keyword.merge(opts, action: :ready, actor: actor))
      end
    end)
  end
end
