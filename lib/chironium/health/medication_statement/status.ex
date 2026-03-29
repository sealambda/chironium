defmodule Chironium.Health.MedicationStatement.Status do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-medication-statement-status.html
  """

  use Ash.Type.Enum,
    values: [
      recorded: [
        label: "Recorded",
        description: "The action of recording the medication statement is finished."
      ],
      entered_in_error: [
        label: "Entered in Error",
        description:
          "Some of the actions that are implied by the medication usage may have occurred. For example, the patient may have taken some of the medication. Clinical decision support systems should take this status into account."
      ],
      draft: [
        label: "Draft",
        description: "The medication usage is draft or preliminary."
      ]
    ]

  def graphql_type(_), do: :medication_statement_status
end
