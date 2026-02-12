defmodule Chironium.Health.Condition do
  @moduledoc """
  https://hl7.org/fhir/R5/condition.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshAdmin.Resource]

  postgres do
    table "conditions"
  end

  graphql do
    type :condition

    mutations do
      create :create_condition, :create
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:condition]}
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
    attribute :clinical_status, Chironium.Health.Condition.ClinicalStatus do
      public? true
    end

    attribute :verification_status, Chironium.Health.Condition.VerificationStatus do
      public? true
    end

    attribute :code, Chironium.Health.Datatypes.CodeableConcept do
      public? true
    end

    attribute :note, {:array, Chironium.Health.Datatypes.Annotation} do
      description "Additional information about the Condition"
      public? true
    end
  end

  relationships do
    belongs_to :subject, Chironium.Health.Patient do
      public? true
      allow_nil? false
    end
  end
end
