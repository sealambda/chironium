defmodule Chironium.Health.Condition.VerificationStatus do
  @moduledoc """
  The verification status to support or decline the clinical status of the condition or diagnosis.

  https://hl7.org/fhir/R5/valueset-condition-ver-status.html
  """

  use Ash.Type.Enum,
    values: [
      unconfirmed: [
        label: "Unconfirmed",
        description:
          "There is not sufficient diagnostic and/or clinical evidence to treat this as a confirmed condition."
      ],
      provisional: [
        label: "Provisional",
        description:
          "This is a tentative diagnosis - still a candidate that is under consideration."
      ],
      differential: [
        label: "Differential",
        description:
          "One of a set of potential (and typically mutually exclusive) diagnoses asserted to further guide the diagnostic process and preliminary treatment."
      ],
      confirmed: [
        label: "Confirmed",
        description:
          "There is sufficient diagnostic and/or clinical evidence to treat this as a confirmed condition."
      ],
      refuted: [
        label: "Refuted",
        description:
          "This condition has been ruled out by subsequent diagnostic and clinical evidence."
      ],
      entered_in_error: [
        label: "Entered in Error",
        description: "The statement was entered in error and is not valid."
      ]
    ]

  def graphql_type(_), do: :condition_verification_status
end
