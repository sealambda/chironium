defmodule Chironium.Terminology.CodeSystem.ContentMode do
  @moduledoc """
  The extent of the content of the code system (the concepts and codes it defines) are represented in a code system resource.

  https://hl7.org/fhir/valueset-codesystem-content-mode.html
  """

  use Ash.Type.Enum,
    values: [
      not_present: [
        label: "Not Present",
        description:
          "None of the concepts defined by the code system are included in the code system resource."
      ],
      example: [
        label: "Example",
        description:
          "A subset of the valid externally defined concepts are included in the code system resource. There is no specific purpose or documented intent other than for illustrative purposes."
      ],
      fragment: [
        label: "Fragment",
        description:
          "A subset of the code system concepts are included in the code system resource. This is a curated subset released for a specific purpose under the governance of the code system steward, and that the intent, bounds and consequences of the fragmentation are clearly defined in the fragment or the code system documentation. Fragments are also known as partitions."
      ],
      complete: [
        label: "Complete",
        description:
          "All the concepts defined by the code system are included in the code system resource."
      ],
      supplement: [
        label: "Supplement",
        description:
          "The resource doesn't define any new concepts; it just provides additional designations and properties to another code system."
      ]
    ]
end
