defmodule Chironium.Health.ServiceRequest.Status do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-request-status.html
  """

  use Ash.Type.Enum,
    values: [
      draft: [
        label: "Draft",
        description:
          "The request has been created but is not yet complete or ready for action."
      ],
      active: [
        label: "Active",
        description: "The request is in force and ready to be acted upon."
      ],
      on_hold: [
        label: "On Hold",
        description:
          "The request (and any implicit authorization to act) has been temporarily withdrawn but is expected to resume in the future."
      ],
      revoked: [
        label: "Revoked",
        description:
          "The request (and any implicit authorization to act) has been terminated prior to the known full completion of the intended actions."
      ],
      completed: [
        label: "Completed",
        description:
          "The activity described by the request has been fully performed. No further activity will occur."
      ],
      entered_in_error: [
        label: "Entered in Error",
        description:
          "This request should never have existed and should be considered void."
      ],
      unknown: [
        label: "Unknown",
        description:
          "The authoring/source system does not know which of the status values currently applies for this request."
      ]
    ]

  def graphql_type(_), do: :service_request_status
end
