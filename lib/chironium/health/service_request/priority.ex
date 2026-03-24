defmodule Chironium.Health.ServiceRequest.Priority do
  @moduledoc """
  Identifies the level of importance to be assigned to actioning the request.

  https://hl7.org/fhir/R5/valueset-request-priority.html
  """

  use Ash.Type.Enum,
    values: [
      routine: [
        label: "Routine",
        description: "The request has normal priority."
      ],
      urgent: [
        label: "Urgent",
        description: "The request should be actioned promptly - higher priority than routine."
      ],
      asap: [
        label: "ASAP",
        description:
          "The request should be actioned as soon as possible - higher priority than urgent."
      ],
      stat: [
        label: "STAT",
        description:
          "The request should be actioned immediately - highest possible priority. E.g. an emergency."
      ]
    ]

  def graphql_type(_), do: :request_priority
end
