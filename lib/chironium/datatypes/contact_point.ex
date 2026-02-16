defmodule Chironium.Datatypes.ContactPoint do
  @moduledoc """
  https://hl7.org/fhir/R5/datatypes.html#ContactPoint
  """

  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :contact_point
  end

  validations do
    validate present(:system) do
      description "A system is required if a value is provided."
      where present(:value)
    end
  end

  attributes do
    attribute :system, Chironium.Datatypes.ContactPoint.System do
      description "Details of a Technology mediated contact point (phone, fax, email, etc.)"
      public? true
    end

    attribute :value, :string do
      description "The actual contact point details"
      public? true
    end

    attribute :use, Chironium.Datatypes.ContactPoint.Use do
      description "Identifies the purpose for the contact point"
      public? true
    end

    # I would just sort the array as we prefer
    # attribute :rank, :integer do
    #   description "Specify preferred order of use (1 = highest)"
    #   public? true
    # end

    attribute :period, Chironium.Datatypes.Period do
      description "Time period when the contact point was/is in use"
      public? true
    end
  end
end
