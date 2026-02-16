defmodule Chironium.Datatypes.Quantity do
  @moduledoc """
  https://hl7.org/fhir/R5/datatypes.html#Quantity
  """
  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :quantity
  end

  validations do
    validate present(:system) do
      message "If a code for the unit is present, the system SHALL also be present"
      where present(:code)
    end
  end

  attributes do
    attribute :value, :decimal do
      public? true
    end

    attribute :unit, :string do
      public? true
    end

    attribute :system, :string do
      public? true
    end

    attribute :code, :string do
      public? true
    end
  end
end
