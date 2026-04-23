defmodule Chironium.Datatypes.Age do
  @moduledoc """
  A duration of time during which an organism (or a process) has existed.

  Age is a Quantity restricted to time-related units. If system is present,
  it SHALL be UCUM. If value is present, it SHALL be positive.

  https://hl7.org/fhir/R5/datatypes.html#Age
  """

  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :age
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

    attribute :code, Chironium.Datatypes.Age.Unit do
      public? true
    end

    attribute :value, :decimal do
      public? true
    end
  end
end
