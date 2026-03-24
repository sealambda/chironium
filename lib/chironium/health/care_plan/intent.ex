defmodule Chironium.Health.CarePlan.Intent do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-care-plan-intent.html
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
      order: [
        label: "Order",
        description:
          "The request represents a request/demand and authorization for action by the requestor."
      ],
      option: [
        label: "Option",
        description:
          "The request represents a component or option for a RequestOrchestration that establishes timing, currentCondition and/or other aspects of a subject's care plan."
      ],
      directive: [
        label: "Directive",
        description:
          "The request represents a legally binding instruction authored by a Patient or RelatedPerson."
      ]
    ]

  def graphql_type(_), do: :care_plan_intent
end
