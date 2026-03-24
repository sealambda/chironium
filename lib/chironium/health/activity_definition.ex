defmodule Chironium.Health.ActivityDefinition do
  @moduledoc """
  A resource that describes an action to be taken. Used to define
  individual activities within a PlanDefinition.

  https://hl7.org/fhir/R5/activitydefinition.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "activity_definitions"
  end

  graphql do
    type :activity_definition

    mutations do
      create :create_activity_definition, :create
      update :update_activity_definition, :update
      destroy :delete_activity_definition, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:activity_definition]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]
  end

  policies do
    policy always() do
      authorize_if always()
    end
  end

  attributes do
    attribute :name, :string do
      description "Computer-friendly name for this activity definition"
      public? true
    end

    attribute :title, :string do
      description "Human-friendly name for this activity definition"
      public? true
    end

    attribute :status, Chironium.Health.PlanDefinition.Status do
      description "Publication status"
      allow_nil? false
      public? true
      default :draft
    end

    attribute :description, :string do
      description "Natural language description of the activity definition"
      public? true
    end

    attribute :kind, Chironium.Health.ActivityDefinition.Kind do
      description "Kind of resource to create when the activity definition is applied"
      public? true
    end

    attribute :code, Chironium.Datatypes.CodeableConcept do
      description "Detail type of activity"
      public? true
    end

    attribute :intent, Chironium.Health.ServiceRequest.Intent do
      description "Default intent for the resulting resource"
      public? true
    end

    attribute :priority, Chironium.Health.ServiceRequest.Priority do
      description "Default priority for the resulting resource"
      public? true
    end

    attribute :do_not_perform, :boolean do
      description "When true, the activity should not be performed"
      public? true
      default false
    end

    attribute :timing_duration, Chironium.Datatypes.Duration do
      description "When activity is to occur (as a duration)"
      public? true
    end
  end
end
