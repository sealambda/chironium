defmodule Chironium.Health.MedicationRequest.DispenseRequest do
  @moduledoc """
  Specific instructions for how the medication should be dispensed (supplied) to
  the patient — quantity per fill, how many refills are authorized, and over what
  duration the prescription is valid.

  https://hl7.org/fhir/R5/medicationrequest-definitions.html#MedicationRequest.dispenseRequest

  This is a pragmatic subset of FHIR's `dispenseRequest` backbone, omitting the
  rarely-needed `initialFill`, `dispenseInterval`, `performer`, and `dispenser`.
  """

  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :medication_request_dispense_request
  end

  validations do
    validate compare(:number_of_repeats_allowed, greater_than_or_equal_to: 0) do
      message "Number of repeats cannot be negative."
      where present(:number_of_repeats_allowed)
    end
  end

  attributes do
    attribute :quantity, Chironium.Datatypes.Quantity do
      description "Amount of medication to supply per dispense."
      public? true
    end

    attribute :number_of_repeats_allowed, :integer do
      description "Number of refills authorized beyond the initial dispense."
      public? true
    end

    attribute :expected_supply_duration, Chironium.Datatypes.Duration do
      description "How long the supplied quantity is expected to last."
      public? true
    end

    attribute :validity_period, Chironium.Datatypes.Period do
      description "The window during which the prescription may be dispensed."
      public? true
    end
  end
end
