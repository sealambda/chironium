defmodule Chironium.Health.Goal do
  @doc """
  Describes the intended objective(s) for a patient, group or organization care, for example,
  weight loss, restoring an activity of daily living,obtaining herd immunity via immunization,
  meeting a process improvement objective, etc.

  https://hl7.org/fhir/R5/goal.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "goals"
  end

  graphql do
    type :goal

    mutations do
      create :create_goal, :create

      update :update_goal, :update

      destroy :delete_goal, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:goal]}
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
    attribute :lifecycle_status, Chironium.Health.Goal.LifecycleStatus do
      public? true
      allow_nil? false
      default :proposed
    end

    attribute :achievement_status, Chironium.Health.Goal.AchievementStatus do
      public? true
    end

    attribute :category, {:array, Chironium.Health.Goal.Category} do
      public? true
    end

    attribute :continuous, :boolean do
      description "After meeting the goal, ongoing activity is needed to sustain the goal objective"
      public? true
    end

    attribute :priority, Chironium.Health.Goal.Priority do
      public? true
    end

    attribute :description, Chironium.Datatypes.CodeableConcept do
      description "Code or text describing goal"
      allow_nil? false
      public? true
    end

    attribute :start_date, :date do
      description "When goal pursuit begins"
      public? true
    end

    attribute :due_date, :date do
      # TODO dueDuration is also possible, but maybe not needed for now
      description "Reach goal on or before"
      public? true
    end

    attribute :status_date, :date do
      description "When goal status took effect"
      public? true
    end

    attribute :status_reason, :string do
      description "Reason for current status"
      public? true
    end

    attribute :note, {:array, Chironium.Datatypes.Annotation} do
      description "Comments about the goal"
      public? true
    end
  end

  relationships do
    belongs_to :subject, Chironium.Health.Patient do
      description "Who this goal is intended for"
      public? true
      allow_nil? false
    end
  end
end
