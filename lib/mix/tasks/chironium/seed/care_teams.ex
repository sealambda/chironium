defmodule Mix.Tasks.Chironium.Seed.CareTeams do
  @moduledoc "Seed care teams linking existing patients and practitioners in an organization."
  @shortdoc "Seed care teams"

  use Mix.Task

  import Chironium.Generator

  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Helpers.fetch_patients!(tenant)
    practitioners = Helpers.fetch_practitioners!(tenant)

    seed(tenant, patients, practitioners)

    Helpers.info("[Seed] Care teams created for #{length(patients)} patients.")
  end

  @doc "Create a care team for each patient with 1–3 random practitioners."
  def seed(_tenant, _patients, []), do: :ok

  def seed(tenant, patients, practitioners) do
    opts = Helpers.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      team_size = Enum.random(1..min(3, length(practitioners)))
      team_practitioners = Enum.take_random(practitioners, team_size)

      care_team = generate(care_team(Keyword.merge(opts, subject_patient_id: patient.id)))

      Enum.each(team_practitioners, fn practitioner ->
        generate(
          care_team_participant(
            Keyword.merge(opts, care_team_id: care_team.id, practitioner_id: practitioner.id)
          )
        )
      end)
    end)
  end
end
