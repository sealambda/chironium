defmodule Chironium.Health.AllergyIntolerance.ClinicalStatus do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-allergyintolerance-clinical.html
  """

  use Ash.Type.Enum,
    values: [
      active: [
        label: "Active",
        description:
          "The subject is currently experiencing, or is at risk of, a reaction to the identified substance."
      ],
      inactive: [
        label: "Inactive",
        description: "The subject is no longer at risk of a reaction to the identified substance."
      ],
      resolved: [
        label: "Resolved",
        description:
          "A reaction to the identified substance has been clinically reassessed by testing or re-exposure and is considered no longer to be present. Re-exposure could be accidental, unplanned, or outside of any clinical setting."
      ]
    ]

  def graphql_type(_), do: :allergy_intolerance_clinical_status
end
