defmodule Chironium.Health.Datatypes.Period do
  @moduledoc """
  https://hl7.org/fhir/R5/datatypes.html#Period
  """

  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :period
  end

  validations do
    validate attributes_present([:start, :end], at_least: 1)
  end

  attributes do
    attribute :start, :date do
      public? true
    end

    attribute :end, :date do
      public? true
    end
  end
end
