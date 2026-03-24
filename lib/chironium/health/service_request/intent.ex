defmodule Chironium.Health.ServiceRequest.Intent do
  @moduledoc """
  Codes indicating the degree of authority/intentionality associated with a request.

  https://hl7.org/fhir/R5/valueset-request-intent.html
  """

  use Ash.Type.Enum,
    values: [
      proposal: [
        label: "Proposal",
        description:
          "The request is a suggestion made by someone/something that does not have an intention to ensure it occurs and without providing an authorization to act."
      ],
      plan: [
        label: "Plan",
        description:
          "The request represents an intention to ensure something occurs without providing an authorization for others to act."
      ],
      directive: [
        label: "Directive",
        description:
          "The request represents a legally binding instruction authored by a Patient or RelatedPerson."
      ],
      order: [
        label: "Order",
        description:
          "The request represents a request/demand and authorization for action by the requestor."
      ],
      original_order: [
        label: "Original Order",
        description: "The request represents an original authorization for action."
      ],
      reflex_order: [
        label: "Reflex Order",
        description:
          "The request represents an automatically generated supplemental authorization for action based on a parent authorization together with initial results of the action taken against that parent authorization."
      ],
      filler_order: [
        label: "Filler Order",
        description:
          "The request represents the view of an authorization instantiated by a fulfilling system representing the details of the fulfiller's intention to act upon a submitted order."
      ],
      instance_order: [
        label: "Instance Order",
        description:
          "An order created in fulfillment of a broader order that represents the authorization for a single activity occurrence. E.g. The administration of a single dose of a drug."
      ],
      option: [
        label: "Option",
        description:
          "The request represents a component or option for a RequestOrchestration that establishes timing, conditionality and/or other constraints among a set of requests."
      ]
    ]

  def graphql_type(_), do: :request_intent
end
