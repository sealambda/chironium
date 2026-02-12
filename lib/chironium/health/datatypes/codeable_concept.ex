defmodule Chironium.Health.Datatypes.CodeableConcept do
  @moduledoc """
  https://hl7.org/fhir/R5/datatypes.html#CodeableConcept
  """
  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :codeable_concept
  end

  attributes do
    attribute :coding, {:array, Chironium.Health.Datatypes.Coding} do
      public? true
    end

    attribute :text, :string do
      public? true
    end
  end
end
