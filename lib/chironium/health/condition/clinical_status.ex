defmodule Chironium.Health.Condition.ClinicalStatus do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-condition-clinical.html
  """

  use Ash.Type.Enum,
    values: [
      active: [
        label: "Active",
        description:
          "The subject is currently experiencing the condition or situation, there is evidence of the condition or situation, or considered to be a significant risk."
      ],
      recurrence: [
        label: "Recurrence",
        description:
          "The subject is experiencing a reoccurence or repeating of a previously resolved condition or situation, e.g. urinary tract infection, food insecurity."
      ],
      relapse: [
        label: "Relapse",
        description:
          "The subject is experiencing a return of a condition or situation after a period of improvement or remission, e.g. relapse of cancer, alcoholism."
      ],
      inactive: [
        label: "Inactive",
        description:
          "The subject is no longer experiencing the condition or situation and there is no longer evidence or appreciable risk of the condition or situation."
      ],
      remission: [
        label: "Remission",
        description:
          "The subject is not presently experiencing the condition or situation, but there is a risk of the condition or situation returning."
      ],
      resolved: [
        label: "Resolved",
        description:
          "The subject is not presently experiencing the condition or situation and there is a negligible perceived risk of the condition or situation returning."
      ],
      unknown: [
        label: "Unknown",
        description:
          "The authoring/source system does not know which of the status values currently applies for this condition. Note: This concept is not to be used for 'other' - one of the listed statuses is presumed to apply, but the authoring/source system does not know which."
      ]
    ]

  def graphql_type(_), do: :condition_clinical_status
end
