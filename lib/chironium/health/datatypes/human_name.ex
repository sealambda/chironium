defmodule Chironium.Health.Datatypes.HumanName do
  @moduledoc """
  https://hl7.org/fhir/R5/datatypes.html#HumanName
  """

  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :human_name
  end

  alias Chironium.Health.Datatypes

  attributes do
    attribute :use, Datatypes.HumanName.NameUse do
      default :usual
      public? true
    end

    attribute :text, :string do
      description "Text representation of the full name"
      public? true
    end

    attribute :family, :string do
      description "Family name (often called 'Surname')"
      public? true
    end

    attribute :given, {:array, :string} do
      description """
      Given names (not always 'first'). Includes middle names
      This repeating element order: Given Names appear in the correct order for presenting the name
      """

      public? true
    end

    attribute :prefix, {:array, :string} do
      description """
      Parts that come before the name
      This repeating element order: Prefix elements appear in order before the name
      """

      public? true
    end

    attribute :suffix, {:array, :string} do
      description """
      Parts that come after the name
      This repeating element order: Suffixes appear in the correct order for presenting the name
      """

      public? true
    end

    attribute :period, Datatypes.Period do
      description "Time period when name was/is in use"
      public? true
    end
  end
end
