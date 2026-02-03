defmodule Chironium.Subscriptions.Plan do
  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Subscriptions,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource]

  graphql do
    type :subscription_plan
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:subscription_plan]}
  end

  postgres do
    table "subscription_plans"
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]
  end

  attributes do
    attribute :name, :string do
      public? true
    end

    # TODO ISO8601 duration
    # attribute :period_duration, :duration do
    attribute :period_duration, :string do
      public? true
    end

    attribute :price_amount, :money do
      public? true
    end
  end
end
