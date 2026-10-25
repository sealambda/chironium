defmodule Chironium.Seed.ClinicalNotes do
  @moduledoc "Seed free-text clinical note observations for existing patients in an organization."

  alias Chironium.Health.Observation
  alias Chironium.Seed.Tenant

  @notes [
    "Sleep quality has improved over the last two weeks.",
    "Patient reports better meal regularity and hydration.",
    "Exercise adherence is consistent and tolerated well.",
    "Energy levels are stable with fewer afternoon crashes."
  ]

  @doc "Seed 1–3 clinical note observations per patient."
  def seed(tenant, patients, practitioners) do
    base_opts = Tenant.ash_opts(tenant)
    now = DateTime.utc_now()

    Enum.each(patients, fn patient ->
      for _ <- 1..Enum.random(1..3) do
        effective_date_time =
          DateTime.add(now, -Enum.random(1..120) * 86_400 + Enum.random(0..86_399), :second)

        ash_opts = Keyword.put(base_opts, :actor, Enum.random(practitioners))

        Observation
        |> Ash.Changeset.for_create(
          :create,
          %{
            subject_id: patient.id,
            status: :final,
            code: %{text: "clinical-note"},
            value_string: Enum.random(@notes),
            effective_date_time: effective_date_time
          },
          ash_opts
        )
        |> Ash.create!()
      end
    end)
  end
end
