defmodule Chironium.Health.QuestionnaireResponse.Status do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-questionnaire-answers-status.html
  """

  use Ash.Type.Enum,
    values: [
      in_progress: [
        label: "In Progress",
        description:
          "This QuestionnaireResponse has been partially filled out with answers but changes or additions are still expected to be made to it."
      ],
      completed: [
        label: "Completed",
        description:
          "This QuestionnaireResponse has been filled out with answers and the current content is regarded as definitive."
      ],
      amended: [
        label: "Amended",
        description:
          "This QuestionnaireResponse has been filled out with answers, then marked as complete, yet changes or additions have been made to it afterwards."
      ],
      entered_in_error: [
        label: "Entered in Error",
        description: "This QuestionnaireResponse was entered in error and voided."
      ],
      stopped: [
        label: "Stopped",
        description:
          "This QuestionnaireResponse has been partially filled out with answers but has been abandoned. It is unknown whether changes or additions are expected to be made to it."
      ]
    ]

  def graphql_type(_), do: :questionnaire_response_status
end
