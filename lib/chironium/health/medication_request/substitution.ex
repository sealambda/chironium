defmodule Chironium.Health.MedicationRequest.Substitution do
  @moduledoc """
  Whether the prescriber allows a different medication to be dispensed in place
  of the one prescribed (e.g. a generic for a brand).

  https://hl7.org/fhir/R5/medicationrequest-definitions.html#MedicationRequest.substitution

  `allowed_codeable_concept` carries the substitution policy coded with the HL7
  v3 ActSubstanceAdminSubstitution value set
  (http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution) — e.g.
  `G` (generic composition), `TE` (therapeutic alternative), `N` (none).
  `reason` captures why substitution is (or is not) permitted.

  FHIR models `allowed[x]` as a boolean-or-CodeableConcept choice; we keep only
  the coded form, since the `N` (none) code already expresses "not allowed".
  """

  use Ash.Resource,
    data_layer: :embedded,
    embed_nil_values?: false,
    extensions: [AshGraphql.Resource]

  graphql do
    type :medication_request_substitution
  end

  attributes do
    attribute :allowed_codeable_concept, Chironium.Datatypes.CodeableConcept do
      description "Whether substitution is permitted, coded per ActSubstanceAdminSubstitution."
      public? true
    end

    attribute :reason, Chironium.Datatypes.CodeableConcept do
      description "Why substitution should or should not happen."
      public? true
    end
  end
end
