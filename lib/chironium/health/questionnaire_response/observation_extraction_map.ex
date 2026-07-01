defmodule Chironium.Health.QuestionnaireResponse.ObservationExtractionMap do
  @moduledoc """
  Maps a question's clinical code to the typed `Observation` action that records it.

  Only codes the app already understands route to a typed `log_*` action — those are the
  ones the anthropometry/cycle cards read (they filter by exact code + UCUM unit). Every
  entry names the action, how to obtain its value from the answer, and the action input it
  feeds. Codes absent here fall back to a generic observation (see
  `Chironium.Health.QuestionnaireResponse.Changes.ExtractObservations`).

  Codes mirror the constants in `Chironium.Health.Observation`.
  """

  @loinc "http://loinc.org"
  @snomed "http://snomed.info/sct"

  # {system, code} => %{action:, kind:, key:}
  #   kind: :number   -> float argument named `key`, value from a numeric answer
  #         :integer  -> integer argument named `key`, value from a numeric answer
  #         :date     -> no argument; the answer's date becomes `effective_date_time`
  #         :string   -> `value_string` from a free-text / coding answer
  @map %{
    {@loinc, "29463-7"} => %{action: :log_body_weight, kind: :number, key: :weight_kg},
    {@loinc, "8302-2"} => %{action: :log_body_height, kind: :number, key: :height_cm},
    {@loinc, "8279-2"} => %{
      action: :log_chest_circumference,
      kind: :number,
      key: :chest_circumference_cm
    },
    {@loinc, "56063-1"} => %{
      action: :log_hip_circumference,
      kind: :number,
      key: :hip_circumference_cm
    },
    {@loinc, "8280-0"} => %{
      action: :log_waist_circumference,
      kind: :number,
      key: :waist_circumference_cm
    },
    {@loinc, "56072-2"} => %{
      action: :log_arm_circumference,
      kind: :number,
      key: :arm_circumference_cm
    },
    {@loinc, "8286-7"} => %{
      action: :log_thigh_circumference,
      kind: :number,
      key: :thigh_circumference_cm
    },
    {@loinc, "3144-3"} => %{
      action: :log_menstrual_period_duration,
      kind: :integer,
      key: :duration_days
    },
    {@loinc, "63888-2"} => %{action: :log_menarche_age, kind: :integer, key: :age_years},
    {@loinc, "8665-2"} => %{action: :log_menstrual_period_start, kind: :date, key: nil},
    {@snomed, "1163282001"} => %{action: :log_food_preference, kind: :string, key: nil},
    {@snomed, "248135001"} => %{action: :log_food_aversion, kind: :string, key: nil}
  }

  @doc "The typed-action descriptor for a `{system, code}`, or `nil` for the generic fallback."
  def lookup(system, code), do: Map.get(@map, {system, code})
end
