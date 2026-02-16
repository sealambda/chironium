defmodule Chironium.Datatypes.Duration do
  @moduledoc """
  https://hl7.org/fhir/R5/datatypes.html#Duration
  """

  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :duration
  end

  validations do
    validate present(:value) do
      description "There SHALL be a code if there is a value and it SHALL be an expression of time."
      where present(:code)
    end

    validate attribute_equals(:system, "http://unitsofmeasure.org") do
      description "If system is present, it SHALL be UCUM."
      where present(:system)
    end

    validate compare(:value, greater_than_or_equal_to: 0) do
      description "If value is present, it SHALL be positive."
      where present(:value)
    end
  end

  attributes do
    attribute :system, :string do
      public? true
      default "http://unitsofmeasure.org"
    end

    attribute :code, Chironium.Datatypes.Duration.Unit do
      public? true
    end

    attribute :value, :decimal do
      public? true
    end
  end
end
