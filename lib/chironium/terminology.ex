defmodule Chironium.Terminology do
  @moduledoc """
  Domain for terminology resources like SNOMED, LOINC, RxNorm, etc.
  """

  use Ash.Domain,
    otp_app: :chironium,
    extensions: [
      AshGraphql.Domain,
      AshAdmin.Domain,
      AshPaperTrail.Domain
    ]

  admin do
    show? true

    show_resources [
      Chironium.Terminology.CodeSystem,
      Chironium.Terminology.ConceptMap,
      Chironium.Terminology.ConceptMapEntry,
      Chironium.Terminology.Concept,
      Chironium.Terminology.ConceptClosure,
      Chironium.Terminology.ConceptEmbedding,
      Chironium.Terminology.Designation,
      Chironium.Terminology.ValueSet,
      Chironium.Terminology.ValueSetMembership
    ]
  end

  paper_trail do
    include_versions? true
  end

  resources do
    resource Chironium.Terminology.CodeSystem
    resource Chironium.Terminology.ConceptMap
    resource Chironium.Terminology.ConceptMapEntry
    resource Chironium.Terminology.Concept
    resource Chironium.Terminology.ConceptClosure
    resource Chironium.Terminology.ConceptEmbedding
    resource Chironium.Terminology.Designation
    resource Chironium.Terminology.ValueSet
    resource Chironium.Terminology.ValueSetMembership
  end
end
