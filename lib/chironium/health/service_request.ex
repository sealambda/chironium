defmodule Chironium.Health.ServiceRequest do
  @moduledoc """
  A record of a request for service such as diagnostic investigations,
  treatments, or operations to be performed.

  https://hl7.org/fhir/R5/servicerequest.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "service_requests"
  end

  graphql do
    type :service_request

    mutations do
      create :create_service_request, :create

      update :update_service_request, :update

      destroy :delete_service_request, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:service_request]}
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
    attribute :status, Chironium.Health.ServiceRequest.Status do
      description "Lifecycle status of the request"
      allow_nil? false
      public? true
      default :draft
    end

    attribute :intent, Chironium.Health.ServiceRequest.Intent do
      description "Whether the request is a proposal, plan, or order"
      allow_nil? false
      public? true
      default :order
    end

    attribute :priority, Chironium.Health.ServiceRequest.Priority do
      description "Urgency of the request"
      public? true
    end

    attribute :code, Chironium.Datatypes.CodeableConcept do
      description "What is being requested/ordered"
      public? true
    end

    attribute :occurrence_period, Chironium.Datatypes.Period do
      description "When service should occur"
      public? true
    end

    attribute :authored_on, :utc_datetime do
      description "Date request signed"
      public? true
      default &DateTime.utc_now/0
    end

    attribute :note, {:array, Chironium.Datatypes.Annotation} do
      description "Comments about the service request"
      public? true
    end
  end

  relationships do
    belongs_to :subject, Chironium.Health.Patient do
      description "Individual the service is ordered for"
      allow_nil? false
      public? true
    end

    belongs_to :care_plan, Chironium.Health.CarePlan do
      description "CarePlan this request fulfills (basedOn)"
      public? true
      attribute_writable? true
    end

    belongs_to :requester, Chironium.Health.Practitioner do
      description "Who is requesting the service"
      public? true
      attribute_writable? true
    end
  end
end
