defmodule Mix.Tasks.Chironium.Seed.MenstrualCycles do
  @moduledoc "Seed menstrual cycle observations for existing patients in an organization."
  @shortdoc "Seed menstrual cycles"

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

    Helpers.info("[Seed] Menstrual cycles created for #{length(patients)} patients.")
  end

  @doc "Seed 1–3 menstrual cycle entries per patient, each with a start and optional duration."
  def seed(tenant, patients, practitioners) do
    opts = Helpers.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      for _ <- 1..Enum.random(1..3) do
        # Both observations share an effective_date_time so the frontend can pair them.
        effective_date_time = random_past_datetime(7..360)

        cycle_opts =
          Keyword.merge(opts, subject_id: patient.id, actor: Enum.random(practitioners))

        generate(
          observation_menstrual_period_start(
            Keyword.merge(cycle_opts, effective_date_time: effective_date_time)
          )
        )

        generate(
          observation_menstrual_period_duration(
            Keyword.merge(cycle_opts, effective_date_time: effective_date_time)
          )
        )
      end
    end)
  end

  defp random_past_datetime(days_range) do
    days = Enum.random(days_range)
    DateTime.add(DateTime.utc_now(), -days * 86_400 + Enum.random(0..86_399), :second)
  end
end
