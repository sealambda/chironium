defmodule Chironium.Health.MedicationStatement do
  @moduledoc """
  A record of a medication that is being consumed by a patient.
  A MedicationStatement may indicate that the patient may be taking the medication now
  or has taken the medication in the past or will be taking the medication in the future.

  https://hl7.org/fhir/R5/medicationstatement.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshAdmin.Resource]

  postgres do
    table "medication_statements"
  end

  graphql do
    type :medication_statement

    mutations do
      create :create_medication_statement, :create
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:medication_statement]}
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

    attribute :code, Chironium.Datatypes.CodeableConcept do
      public? true
    end

    attribute :note, {:array, Chironium.Datatypes.Annotation} do
      description "Further information about the usage"
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
