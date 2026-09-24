defmodule Chironium.Health.MedicationRequest do
  @moduledoc """
  An order or request for both supply of a medication and the instructions for
  administration to a patient.

  Unlike a `Chironium.Health.MedicationStatement` (which records a medication the
  patient is already taking), a MedicationRequest is a medication prescribed to
  the patient by a Practitioner while using this app. The prescribing
  Practitioner is captured as the `requester`.

  https://hl7.org/fhir/R5/medicationrequest.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "medication_requests"
  end

  graphql do
    type :medication_request

    mutations do
      create :create_medication_request, :create

      update :update_medication_request, :update

      destroy :delete_medication_request, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :version_resource,
           [:medication_request]}
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
      authorize_if Chironium.Accounts.Checks.StaffActor
    end
  end

  changes do
    change Chironium.Health.MedicationRequest.Changes.RelateRequesterToActor, on: [:create]
  end

  attributes do
    attribute :status, Chironium.Health.MedicationRequest.Status do
      description "The state of the prescription."
      public? true
      allow_nil? false
      default :active
    end

    attribute :intent, Chironium.Health.MedicationRequest.Intent do
      description "Whether the request is a proposal, plan, or an original order."
      public? true
      allow_nil? false
      default :order
    end

    attribute :course_of_therapy_type, Chironium.Health.MedicationRequest.CourseOfTherapyType do
      description "The overall pattern of administration (continuous, acute, seasonal)."
      public? true
    end

    attribute :medication, Chironium.Datatypes.CodeableConcept do
      description "What medication was prescribed."
      public? true
    end

    attribute :reason, {:array, Chironium.Datatypes.CodeableConcept} do
      description "The clinical reason(s) the medication was prescribed."
      public? true
    end

    attribute :dosage_instruction, {:array, Chironium.Datatypes.Dosage} do
      description "How the medication should be taken."
      public? true
    end

    attribute :dispense_request, Chironium.Health.MedicationRequest.DispenseRequest do
      description "How the medication should be dispensed (quantity, refills, validity)."
      public? true
    end

    attribute :substitution, Chironium.Health.MedicationRequest.Substitution do
      description "Whether a substitute medication may be dispensed."
      public? true
    end

    attribute :authored_on, :datetime do
      description "When the prescription was initially authored."
      public? true
      default &DateTime.utc_now/0
    end

    attribute :note, {:array, Chironium.Datatypes.Annotation} do
      description "Information about the prescription."
      public? true
    end
  end

  relationships do
    belongs_to :subject, Chironium.Health.Patient do
      description "The patient the prescription is for."
      public? true
      allow_nil? false
    end

    belongs_to :requester, Chironium.Health.Practitioner do
      description "The Practitioner who prescribed the medication. Defaults to the acting Practitioner."
      public? true
    end
  end
end
