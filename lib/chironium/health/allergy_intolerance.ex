defmodule Chironium.Health.AllergyIntolerance do
  @moduledoc """
  Risk of harmful or undesirable physiological response which is specific
  to an individual and associated with exposure to a substance.

  https://hl7.org/fhir/R5/allergyintolerance.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "allergy_intolerances"
  end

  graphql do
    type :allergy_intolerance

    mutations do
      create :create_allergy_intolerance, :create

      update :update_allergy_intolerance, :update

      destroy :delete_allergy_intolerance, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:allergy_intolerance]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]
  end

  # TODO: Add policies
  policies do
    policy always() do
      authorize_if always()
    end
  end

  attributes do
    attribute :clinical_status, Chironium.Health.AllergyIntolerance.ClinicalStatus do
      public? true
    end

    attribute :verification_status, Chironium.Health.AllergyIntolerance.VerificationStatus do
      public? true
    end

    attribute :type, Chironium.Health.AllergyIntolerance.Type do
      public? true
    end

    attribute :code, Chironium.Datatypes.CodeableConcept do
      public? true
    end

    attribute :note, {:array, Chironium.Datatypes.Annotation} do
      description "Additional text not captured in other fields"
      public? true
    end
  end

  relationships do
    belongs_to :patient, Chironium.Health.Patient do
      allow_nil? false
      public? true
    end
  end
end
