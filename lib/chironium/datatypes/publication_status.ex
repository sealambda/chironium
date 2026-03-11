defmodule Chironium.Datatypes.PublicationStatus do
  @moduledoc """
  The lifecycle status of an artifact.

  https://hl7.org/fhir/valueset-publication-status.html
  """

  use Ash.Type.Enum,
    values: [
      draft: [
        label: "Draft",
        description:
          "This resource is still under development and is not yet considered to be ready for normal use."
      ],
      active: [
        label: "Active",
        description: "This resource is ready for normal use."
      ],
      retired: [
        label: "Retired",
        description:
          "This resource has been withdrawn or superseded and should no longer be used."
      ],
      unknown: [
        label: "Unknown",
        description:
          "The authoring system does not know which of the status values currently applies for this resource. Note: This concept is not to be used for 'other' - one of the listed statuses is presumed to apply, it's just not known which one."
      ]
    ]

  def graphql_type(_), do: :publication_status
end
