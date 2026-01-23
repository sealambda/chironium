defmodule Chironium.Health.Embeds.CycleSymptom do
  @moduledoc """
  Embedded resource for menstrual cycle symptoms.

  Tracks symptom type and severity for cycle records.
  """
  use Ash.Resource, data_layer: :embedded

  attributes do
    attribute :type, :atom do
      allow_nil? false
      public? true

      constraints one_of: [
                    :CRAMPS,
                    :HEADACHE,
                    :BLOATING,
                    :FATIGUE,
                    :MOOD_CHANGES,
                    :BACK_PAIN,
                    :BREAST_TENDERNESS,
                    :NAUSEA,
                    :ACNE,
                    :INSOMNIA
                  ]
    end

    attribute :severity, :atom do
      allow_nil? false
      public? true
      constraints one_of: [:MILD, :MODERATE, :SEVERE]
    end
  end
end
