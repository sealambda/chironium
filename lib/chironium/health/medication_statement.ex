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
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "medication_statements"
  end

  graphql do
    type :medication_statement

    mutations do
      create :create_medication_statement, :create

      update :update_medication_statement, :update

      destroy :delete_medication_statement, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:medication_statement]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]
  end

  policies do
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if {Chironium.Health.Checks.PatientSubjectVisibleToActor, relationship: :subject}
    end

    policy action([:create, :update, :destroy]) do
      authorize_if actor_present()
    end
  end

  attributes do
    attribute :status, Chironium.Health.MedicationStatement.Status do
      description "Whether the medication is being consumed or administered."
      public? true
      allow_nil? false
      default :recorded
    end

    # TODO: Dosage and effective period/timing

    attribute :medication, Chironium.Datatypes.CodeableConcept do
      description "What medication was taken."
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
