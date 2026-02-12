defmodule Chironium.CRM.Contact do
  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.CRM,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource]

  postgres do
    table "contacts"
  end

  graphql do
    type :contact

    mutations do
      create :create_contact, :create
      create :create_contact_with_contact_points, :create_with_contact_points
      update :update_contact, :update
    end

    queries do
      read_one :get_contact, :read
      list :list_contacts, :read
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:contact]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]

    create :create_with_contact_points do
      description "Create a contact with initial contact points (email, phone, ...)"

      accept [:name]

      argument :contact_points, {:array, :map} do
        allow_nil? false
      end

      change manage_relationship(:contact_points, type: :create)
    end
  end

  # TODO: Add policies
  policies do
    policy always() do
      authorize_if always()
    end
  end

  attributes do
    attribute :name, :string do
      public? true
    end
  end

  relationships do
    has_many :contact_points, Chironium.CRM.ContactPoint do
      public? true
    end
  end
end
