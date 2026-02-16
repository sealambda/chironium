defmodule Chironium.Health.Patient do
  @moduledoc """
  https://hl7.org/fhir/R5/patient.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshAdmin.Resource]

  postgres do
    table "patients"
  end

  graphql do
    type :patient

    mutations do
      create :create_patient, :create
      create :create_patient_with_person, :create_patient_with_person
    end

    queries do
      list :list_patients, :read
      get :get_patient, :read
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:patient]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]

    create :create_patient_with_person do
      description "Create a patient and a new person"

      argument :person, :map do
        allow_nil? false
      end

      change manage_relationship(:person, type: :create)
    end
  end

  # TODO: Add policies
  policies do
    policy always() do
      authorize_if always()
    end
  end

  attributes do
  end

  relationships do
    belongs_to :person, Chironium.CRM.Person do
      public? true
    end

    has_many :allergy_intolerances, Chironium.Health.AllergyIntolerance do
      public? true

      # For some reason this is actually patient_id instead of subject_id - according to the FHIR spec
      destination_attribute :patient_id
    end

    has_many :conditions, Chironium.Health.Condition do
      public? true
      destination_attribute :subject_id
    end

    has_many :medication_statements, Chironium.Health.MedicationStatement do
      public? true
      destination_attribute :subject_id
    end

    has_many :observations, Chironium.Health.Observation do
      public? true
      destination_attribute :subject_id
    end

    # TODO Should use the NutritionOrder resource instead: https://hl7.org/fhir/R5/nutritionorder.html
    has_many :nutrition_plans, Chironium.Health.NutritionPlan do
      public? true
      destination_attribute :patient_id
    end
  end
end
