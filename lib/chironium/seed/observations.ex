defmodule Chironium.Seed.Observations do
  @moduledoc "Seed anthropometric observations for existing patients in an organization."

  import Chironium.Generator

  alias Chironium.Seed.Tenant

  @doc "Seed height, weight, and circumference observations for each patient."
  def seed(tenant, patients, practitioners) do
    opts = Tenant.ash_opts(tenant)

    Enum.each(patients, fn patient ->
      seed_for_patient(patient, opts, practitioners)
    end)
  end

  defp seed_for_patient(patient, opts, practitioners) do
    patient_opts = Keyword.merge(opts, subject_id: patient.id, actor: Enum.random(practitioners))

    # Height first, then weight, so BMI can be computed.
    for _ <- 1..Enum.random(1..3) do
      generate(observation_body_height(patient_opts))
    end

    for _ <- 1..Enum.random(2..5) do
      generate(observation_body_weight(patient_opts))
    end

    # Hip first, then waist, so waist-hip ratio can be computed.
    for _ <- 1..Enum.random(0..3)//1 do
      generate(observation_hip_circumference(patient_opts))
    end

    for _ <- 1..Enum.random(0..3)//1 do
      generate(observation_waist_circumference(patient_opts))
    end

    for _ <- 1..Enum.random(0..2)//1 do
      generate(observation_chest_circumference(patient_opts))
    end

    for _ <- 1..Enum.random(0..2)//1 do
      generate(observation_arm_circumference(patient_opts))
    end

    for _ <- 1..Enum.random(0..2)//1 do
      generate(observation_thigh_circumference(patient_opts))
    end

    # Food observations — take_random ensures no duplicate labels per patient.
    seed_food_preferences()
    |> Enum.take_random(Enum.random(1..2))
    |> Enum.each(fn value ->
      generate(observation_food_preference(Keyword.merge(patient_opts, value_string: value)))
    end)

    seed_food_aversions()
    |> Enum.take_random(Enum.random(1..2))
    |> Enum.each(fn value ->
      generate(observation_food_aversion(Keyword.merge(patient_opts, value_string: value)))
    end)
  end
end
