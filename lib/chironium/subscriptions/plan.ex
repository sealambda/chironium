defmodule Chironium.Subscriptions.Plan do
  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Subscriptions,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "subscription_plans"
  end

  graphql do
    type :subscription_plan

    queries do
      list :list_subscription_plans, :read
    end

    mutations do
      create :create_subscription_plan, :create
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :version_resource,
           [:subscription_plan]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]
  end

  policies do
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if Chironium.Accounts.Checks.StaffActor
    end

    policy action_type([:create, :update, :destroy]) do
      authorize_if Chironium.Accounts.Checks.PowerUser
    end
  end

  attributes do
    attribute :name, :string do
      public? true
    end

    attribute :duration, Chironium.Datatypes.Duration do
      public? true
    end

    attribute :price_amount, :money do
      public? true
    end
  end
end
