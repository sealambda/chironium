defmodule Chironium.Health.Observation.ObservationType do
  @moduledoc """
  Ergonomic enum representing pre-defined FHIR-coded observation types.

  Abstracts LOINC and SNOMED system/code pairs so API clients can filter
  observations by a stable symbolic name instead of hardcoding terminology codes.
  """

  use Ash.Type.Enum,
    values: [
      :body_weight,
      :body_height,
      :bmi,
      :waist_hip_ratio,
      :chest_circumference,
      :hip_circumference,
      :waist_circumference,
      :arm_circumference,
      :thigh_circumference,
      :menstrual_period_start,
      :menstrual_period_duration,
      :menarche_age,
      :food_preference,
      :food_aversion
    ]

  def graphql_type(_), do: :observation_type
end
