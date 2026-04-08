defmodule Mix.Tasks.Chironium.Seed.Observations do
  @moduledoc "Seed anthropometric observations for existing patients in an organization."
  @shortdoc "Seed observations"

  use Mix.Task

  alias Mix.Tasks.Chironium.Seed.Helpers

  @impl true
  def run(args) do
    {tenant, _opts} = Helpers.parse_tenant!(args)

    Helpers.ensure_started!()
    patients = Helpers.fetch_patients!(tenant)

    seed(tenant, patients)

    Helpers.info("[Seed] Observations created for #{length(patients)} patients.")
  end

  @doc "Seed height, weight, and circumference observations for each patient."
  def seed(tenant, patients) do
    opts = Helpers.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      seed_for_patient(patient, opts)
    end)
  end

  defp seed_for_patient(patient, opts) do
    # Height first, then weight, so BMI can be computed.
    for _ <- 1..Enum.random(1..3) do
      create_observation(patient, :log_body_height, %{height_cm: 150.0 + :rand.uniform() * 40}, opts)
    end

    for _ <- 1..Enum.random(2..5) do
      create_observation(patient, :log_body_weight, %{weight_kg: 50.0 + :rand.uniform() * 60}, opts)
    end

    # Hip first, then waist, so waist-hip ratio can be computed.
    for _ <- 1..Enum.random(0..3)//1 do
      create_observation(patient, :log_hip_circumference, %{hip_circumference_cm: 85.0 + :rand.uniform() * 30}, opts)
    end

    for _ <- 1..Enum.random(0..3)//1 do
      create_observation(patient, :log_waist_circumference, %{waist_circumference_cm: 65.0 + :rand.uniform() * 40}, opts)
    end

    for _ <- 1..Enum.random(0..2)//1 do
      create_observation(patient, :log_chest_circumference, %{chest_circumference_cm: 80.0 + :rand.uniform() * 30}, opts)
    end
  end

  defp create_observation(patient, action_name, params, opts) do
    params
    |> Map.put(:subject_id, patient.id)
    |> Map.put(:effective_date_time, random_past_datetime(1..365))
    |> then(&Ash.Changeset.for_create(Chironium.Health.Observation, action_name, &1, opts))
    |> Ash.create!()
  end

  defp random_past_datetime(days_range) do
    days = Enum.random(days_range)
    DateTime.add(DateTime.utc_now(), -days * 86_400 + Enum.random(0..86_399), :second)
  end
end
