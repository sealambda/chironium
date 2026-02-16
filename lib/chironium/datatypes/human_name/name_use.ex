defmodule Chironium.Datatypes.HumanName.NameUse do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-name-use.html
  """

  use Ash.Type.Enum,
    values: [
      usual: [
        label: "Usual",
        description: "Known as/conventional/the one you normally use."
      ],
      official: [
        label: "Official",
        description:
          "The formal name as registered in an official (government) registry, but which name might not be commonly used. May be called 'legal name'."
      ],
      temp: [
        label: "Temp",
        description:
          "A temporary name. Name.period can provide more detailed information. This may also be used for temporary names assigned at birth or in emergency situations."
      ],
      nickname: [
        label: "Nickname",
        description:
          "A name that is used to address the person in an informal manner, but is not part of their formal or usual name."
      ],
      anonymous: [
        label: "Anonymous",
        description:
          "Anonymous assigned name, alias, or pseudonym (used to protect a person's identity for privacy reasons)."
      ],
      old: [
        label: "Old",
        description:
          "This name is no longer in use (or was never correct, but retained for records)."
      ],
      maiden: [
        label: "Maiden",
        description:
          "A name used prior to changing name because of marriage. This name use is for use by applications that collect and store names that were used prior to a marriage. Marriage naming customs vary greatly around the world, and are constantly changing. This term is not gender specific. The use of this term does not imply any particular history for a person's name."
      ]
    ]

  def graphql_type(_), do: :name_use
end
