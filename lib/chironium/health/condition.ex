defmodule Chironium.Health.Condition do
  @moduledoc """
  A clinical condition, problem, diagnosis, or other event, situation,
  issue, or clinical concept that has risen to a level of concern.

  https://hl7.org/fhir/R5/condition.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "conditions"
  end

  graphql do
    type :condition

    mutations do
      create :create_condition, :create

      update :update_condition, :update

      destroy :delete_condition, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:condition]}
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

  validations do
    validate attributes_present([:onset_date_time, :onset_age, :onset_period], at_most: 1)
    validate attributes_present([:abatement_date_time, :abatement_period], at_most: 1)
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

    attribute :onset_date_time, :datetime do
      description "Estimated or actual date or date-time the condition began"
      public? true
    end

    attribute :onset_age, Chironium.Datatypes.Age do
      description "Estimated or actual age at which the condition began"
      public? true
    end

    attribute :onset_period, Chironium.Datatypes.Period do
      description "Estimated or actual period the condition began"
      public? true
    end

    attribute :abatement_date_time, :datetime do
      description "When in resolution/remission"
      public? true
    end

    attribute :abatement_period, Chironium.Datatypes.Period do
      description "Period of resolution/remission"
      public? true
    end

    attribute :recorded_date, :datetime do
      description "Date condition was first recorded"
      public? true
    end

    attribute :note, {:array, Chironium.Datatypes.Annotation} do
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
