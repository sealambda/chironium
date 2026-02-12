defmodule Chironium.Health.AllergyIntolerance.VerificationStatus do
  @moduledoc """
  The verification status to support or decline the clinical status of the allergy or intolerance.

  https://hl7.org/fhir/R5/valueset-allergyintolerance-verification.html
  """

  use Ash.Type.Enum,
    values: [
      presumed: [
        label: "Presumed",
        description:
          "The available clinical information supports a high liklihood of the propensity for a reaction to the identified substance."
      ],
      unconfirmed: [
        label: "Unconfirmed",
        description:
          "The propensity for a reaction to the identified substance has not been objectively verified."
      ],
      confirmed: [
        label: "Confirmed",
        description:
          "The propensity for a reaction to the identified substance has been objectively verified (which may include clinical evidence by testing, rechallenge, or observation)."
      ],
      refuted: [
        label: "Refuted",
        description:
          "A propensity for a reaction to the identified substance has been disputed or disproven with a sufficient level of clinical certainty to justify invalidating the assertion. This might or might not include testing or rechallenge."
      ],
      entered_in_error: [
        label: "Entered in Error",
        description: "The statement was entered in error and is not valid."
      ]
    ]

  def graphql_type(_), do: :allergy_intolerance_verification_status
end
