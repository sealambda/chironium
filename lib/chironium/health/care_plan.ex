defmodule Chironium.Health.CarePlan do
  @moduledoc """
  Describes the intention of how one or more practitioners intend to deliver
  care for a particular patient, group or community for a period of time,
  possibly limited to care for a specific condition or set of conditions.

  https://hl7.org/fhir/R5/careplan.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "care_plans"
  end

  graphql do
    type :care_plan

    mutations do
      create :create_care_plan, :create

      update :update_care_plan, :update

      destroy :delete_care_plan, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:care_plan]}
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
    attribute :status, Chironium.Health.CarePlan.Status do
      description "Lifecycle status of the care plan"
      allow_nil? false
      public? true
      default :draft
    end

    attribute :intent, Chironium.Health.CarePlan.Intent do
      description "Level of authority/intentionality associated with this care plan"
      allow_nil? false
      public? true
      default :plan
    end

    attribute :title, :string do
      description "Human-friendly name for the care plan"
      public? true
    end

    attribute :description, :string do
      description "Summary of nature of plan"
      public? true
    end

    attribute :period, Chironium.Datatypes.Period do
      description "Time period plan covers"
      public? true
    end

    attribute :note, {:array, Chironium.Datatypes.Annotation} do
      description "Comments about the plan"
      public? true
    end
  end

  relationships do
    belongs_to :subject, Chironium.Health.Patient do
      description "Who the care plan is for"
      allow_nil? false
      public? true
    end

    has_many :service_requests, Chironium.Health.ServiceRequest do
      description "Service requests fulfilling this care plan"
      public? true
      destination_attribute :care_plan_id
    end
  end
end
