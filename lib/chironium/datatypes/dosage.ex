defmodule Chironium.Datatypes.Dosage do
  @moduledoc """
  How a medication is/should be taken by the patient.

  https://hl7.org/fhir/R5/dosage.html

  This is a pragmatic subset of the FHIR `Dosage` datatype scoped to what the
  app needs. Free-text instructions (`text`) are the workhorse — most scripts
  are simply "1 tablet twice daily" — with a small structured layer on top:

    * `dose_quantity` flattens FHIR's `doseAndRate[].doseQuantity` (we model a
      single dose, not the full dose/rate array).
    * `frequency`/`period`/`period_unit` flatten FHIR's `timing.repeat`
      (frequency every period<unit>), rather than reproducing the full
      `Timing` backbone (bounds, dayOfWeek, timeOfDay, event…).
  """

  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :dosage
  end

  validations do
    validate present(:period_unit) do
      message "A period unit is required when a period is given."
      where present(:period)
    end

    validate compare(:frequency, greater_than: 0) do
      message "Frequency must be positive."
      where present(:frequency)
    end

    validate compare(:period, greater_than: 0) do
      message "Period must be positive."
      where present(:period)
    end
  end

  attributes do
    attribute :text, :string do
      description "Free-text dosage instructions, e.g. \"Take one tablet by mouth twice daily\"."
      public? true
    end

    attribute :patient_instruction, :string do
      description "Patient-facing instructions in lay language."
      public? true
    end

    attribute :as_needed, :boolean do
      description "Whether the medication is taken only as needed (pro re nata)."
      public? true
    end

    attribute :route, Chironium.Datatypes.CodeableConcept do
      description "How the drug should enter the body, e.g. oral, topical."
      public? true
    end

    attribute :dose_quantity, Chironium.Datatypes.Quantity do
      description "Amount of medication administered per dose."
      public? true
    end

    attribute :frequency, :integer do
      description "Number of times the dose is taken per period."
      public? true
    end

    attribute :period, :decimal do
      description "How often the dose is repeated, expressed as a number of period units."
      public? true
    end

    attribute :period_unit, Chironium.Datatypes.Duration.Unit do
      description "The unit of time for the repeat period (e.g. d for daily)."
      public? true
    end
  end
end
