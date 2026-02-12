defmodule Chironium.Health.Datatypes.Annotation do
  @moduledoc """
  https://hl7.org/fhir/R5/datatypes.html#Annotation
  """

  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :annotation
  end

  validations do
    validate present([:author_reference, :author_string], exactly: 1)
    validate present(:time)
    validate present(:text)
  end

  attributes do
    attribute :author_reference, :string do
      public? true
    end

    attribute :author_string, :string do
      public? true
    end

    attribute :time, :datetime do
      public? true
      default &DateTime.utc_now/0
    end

    attribute :text, :string do
      public? true
    end
  end
end
