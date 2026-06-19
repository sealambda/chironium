defmodule Chironium.Health.MedicationRequest.CourseOfTherapyType do
  @moduledoc """
  The overall pattern of medication administration the prescription describes.

  https://hl7.org/fhir/R5/codesystem-medicationrequest-course-of-therapy.html

  FHIR models this as a `CodeableConcept` with only an *example* binding (weaker
  than the *required* binding on status/intent). We deliberately narrow it to a
  hard enum of the standard codes, as the set is small and stable for the app's
  scope and renders as a dropdown for free.
  """

  use Ash.Type.Enum,
    values: [
      continuous: [
        label: "Continuous long term therapy",
        description:
          "A medication which is expected to be continued beyond the present order and which the patient should be assumed to be taking unless explicitly stopped."
      ],
      acute: [
        label: "Short course (acute) therapy",
        description:
          "A medication which the patient is only expected to consume for the duration of the current order and which is not expected to be renewed."
      ],
      seasonal: [
        label: "Seasonal",
        description:
          "A medication which is expected to be used on a part time basis at certain times of the year."
      ]
    ]

  def graphql_type(_), do: :medication_request_course_of_therapy_type
end
