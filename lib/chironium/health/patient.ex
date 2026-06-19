defmodule Chironium.Health.Patient do
  @moduledoc """
  Demographics and other administrative information about an individual or animal receiving care or other health-related services.

  https://hl7.org/fhir/R5/patient.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "patients"
  end

  archive do
    archive_related [
      :allergy_intolerances,
      :conditions,
      :goals,
      :medication_requests,
      :medication_statements,
      :observations,
      :care_teams,
      :nutrition_plans
    ]
  end

  graphql do
    type :patient

    mutations do
      create :create_patient, :create
      create :create_patient_with_person, :create_patient_with_person

      update :update_patient, :update

      destroy :delete_patient, :destroy
    end

    queries do
      list :list_patients, :list
      get :get_patient, :read
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:patient]}
  end

  actions do
    defaults [:destroy, create: :*, update: :*]

    read :read do
      primary? true
      pagination keyset?: true
    end

    read :list do
      pagination keyset?: true

      argument :practitioner_id, :uuid do
        description "Filter patients assigned to this practitioner via active care teams."
      end

      filter expr(
               if not is_nil(^arg(:practitioner_id)) do
                 exists(
                   care_teams,
                   status == :active and
                     exists(
                       participants,
                       active == true and practitioner_id == ^arg(:practitioner_id)
                     )
                 )
               else
                 true
               end
             )
    end

    create :create_patient_with_person do
      description "Create a patient and a new person"

      argument :person, :map do
        allow_nil? false
      end

      change manage_relationship(:person, type: :create)
    end
  end

  policies do
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    policy action([:read, :list]) do
      authorize_if Chironium.Health.Checks.PatientVisibleToActor
    end

    policy action([:create, :create_patient_with_person, :update, :destroy]) do
      authorize_if actor_present()
    end
  end

  changes do
    change Chironium.Health.Patient.Changes.AssignPractitionerCareTeam, on: [:create]
  end

  attributes do
  end

  relationships do
    belongs_to :person, Chironium.CRM.Person do
      public? true
    end

    has_many :allergy_intolerances, Chironium.Health.AllergyIntolerance do
      description "Allergies and intolerances for the patient"
      public? true

      # For some reason this is actually patient_id instead of subject_id - according to the FHIR spec
      destination_attribute :patient_id
    end

    has_many :conditions, Chironium.Health.Condition do
      description "Conditions (pathologies/problems) for the patient"
      public? true
      destination_attribute :subject_id
    end

    has_many :goals, Chironium.Health.Goal do
      description "Health goals for the patient"
      public? true
      destination_attribute :subject_id
    end

    has_many :medication_requests, Chironium.Health.MedicationRequest do
      description "Medications prescribed to the patient by a practitioner"
      public? true
      destination_attribute :subject_id
    end

    has_many :medication_statements, Chironium.Health.MedicationStatement do
      description "Medication statements (existing or proposed medications) for the patient"
      public? true
      destination_attribute :subject_id
    end

    has_many :observations, Chironium.Health.Observation do
      description "Vital signs, observations, notes, etc. for the patient"
      public? true
      destination_attribute :subject_id
      default_sort effective_date_time: :desc
    end

    has_many :care_teams, Chironium.Health.CareTeam do
      description "Care teams where this patient is the subject"
      destination_attribute :subject_patient_id
    end

    # TODO Should use the NutritionOrder resource instead: https://hl7.org/fhir/R5/nutritionorder.html
    has_many :nutrition_plans, Chironium.Health.NutritionPlan do
      description "Nutrition plans for the patient"
      public? true
      destination_attribute :patient_id
    end
  end
end
