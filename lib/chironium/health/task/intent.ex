defmodule Chironium.Health.Task.Intent do
  @moduledoc """
  Distinguishes whether the task is a proposal, plan or full order.

  https://hl7.org/fhir/R5/valueset-task-intent.html
  """

  use Ash.Type.Enum,
    values: [
      unknown: [
        label: "Unknown",
        description:
          "The intent is not known. When dealing with Task, it's not always known (or relevant) how the task was initiated - i.e. whether it was proposed, planned, ordered or just done spontaneously."
      ],
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
          "The request represents a component or option for a RequestOrchestration that establishes timing, conditionality and/or other constraints among a set of requests. Refer to RequestOrchestration for additional information on how this status is used."
      ]
    ]

  def graphql_type(_), do: :task_intent
end
