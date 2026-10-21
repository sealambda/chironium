defmodule Chironium.Health.MedicationRequest.Intent do
  @moduledoc """
  Distinguishes whether the medication request is a proposal, plan or full order.

  https://hl7.org/fhir/R5/valueset-medicationrequest-intent.html
  """

  use Ash.Type.Enum,
    values: [
      proposal: [
        label: "Proposal",
        description:
          "The request is a suggestion made by someone/something that doesn't have an intention to ensure it occurs and without providing an authorization to act."
      ],
      plan: [
        label: "Plan",
        description:
          "The request represents an intention to ensure something occurs without providing an authorization for others to act."
      ],
      order: [
        label: "Order",
        description:
          "The request represents a request/demand and authorization for action by a Practitioner."
      ],
      original_order: [
        label: "Original Order",
        description:
          "The request represents the original authorization for the medication request."
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
          "The request represents an instance for a particular order, for example a medication administration record."
      ],
      option: [
        label: "Option",
        description:
          "The request represents a component or option for a RequestOrchestration that establishes timing, conditionality and/or other constraints among a set of requests."
      ]
    ]

  def graphql_type(_), do: :medication_request_intent
end
