defmodule Chironium.CRM.ContactPoint do
  alias Chironium.CRM.ContactPoint

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.CRM,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource]

  graphql do
    type :contact_point

    mutations do
      create :create_contact_point, :create
      update :update_contact_point, :update
    end
  end

  postgres do
    table "contact_points"
  end

  actions do
    defaults [:read, :destroy, create: :*, update: [:label, :value, :is_primary]]
  end

  policies do
    policy always() do
      authorize_if always()
    end
  end

  attributes do
    attribute :type, ContactPoint.Type do
      public? true
    end

    attribute :label, :string do
      allow_nil? true
      public? true
    end

    attribute :value, :string do
      allow_nil? true
      public? true
    end

    # TODO Should it be unique with type and contact_id?
    attribute :is_primary, :boolean do
      allow_nil? false
      default false
      public? true
    end
  end

  relationships do
    belongs_to :contact, Chironium.CRM.Contact do
      allow_nil? false
      public? true
    end
  end
end
