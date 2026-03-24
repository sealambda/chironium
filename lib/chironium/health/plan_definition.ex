defmodule Chironium.Health.PlanDefinition do
  @moduledoc """
  A pre-defined group of actions to be taken in particular circumstances,
  often including conditions, options, and other decision points.

  https://hl7.org/fhir/R5/plandefinition.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "plan_definitions"
  end

  graphql do
    type :plan_definition

    mutations do
      create :create_plan_definition, :create
      update :update_plan_definition, :update
      destroy :delete_plan_definition, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:plan_definition]}
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
      description "Computer-friendly name for this plan definition"
      public? true
    end

    attribute :title, :string do
      description "Human-friendly name for this plan definition"
      public? true
    end

    attribute :status, Chironium.Health.PlanDefinition.Status do
      description "Publication status of the plan definition"
      allow_nil? false
      public? true
      default :draft
    end

    attribute :description, :string do
      description "Natural language description of the plan definition"
      public? true
    end

    attribute :action, {:array, Chironium.Health.PlanDefinition.Action} do
      description "Actions defined by the plan"
      public? true
    end
  end
end
