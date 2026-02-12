defmodule Chironium.Health.Datatypes.Coding do
  @moduledoc """
  https://hl7.org/fhir/R5/datatypes.html#Coding

  TODO: Define some validations to ensure that the codes are valid.
  """

  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :coding
  end

  attributes do
    attribute :system, :string do
      public? true
      allow_nil? false
    end

    attribute :version, :string do
      public? true
    end

    attribute :code, :string do
      public? true
      allow_nil? false
    end

    attribute :display, :string do
      public? true
    end

    attribute :user_selected, :boolean do
      public? true
    end
  end
end
