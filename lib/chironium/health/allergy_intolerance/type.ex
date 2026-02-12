defmodule Chironium.Health.AllergyIntolerance.Type do
  @moduledoc """
  Identification of the underlying physiological mechanism for a Reaction Risk.

  https://hl7.org/fhir/R5/valueset-allergy-intolerance-type.html
  """

  use Ash.Type.Enum,
    values: [
      allergy: [
        label: "Allergy",
        description:
          "A propensity for hypersensitive reaction(s) to a substance. These reactions are most typically type I hypersensitivity, plus other 'allergy-like' reactions, including pseudoallergy."
      ],
      intolerance: [
        label: "Intolerance",
        description:
          "A propensity for adverse reactions to a substance that is judged to be not allergic or 'allergy-like'. These reactions are typically (but not necessarily) non-immune. They are to some degree idiosyncratic and/or patient-specific (i.e. are not a reaction that is expected to occur with most or all patients given similar circumstances)."
      ]
    ]

  def graphql_type(_), do: :allergy_intolerance_type
end
