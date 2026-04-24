defmodule Chironium.Subscriptions.SubscriptionPause do
  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Subscriptions,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource]

  postgres do
    table "subscription_pauses"

    # At most one open pause per subscription at any time.
    custom_indexes do
      index [:subscription_id],
        unique: true,
        where: "end_date IS NULL",
        name: "subscription_pauses_one_open_per_subscription"
    end
  end

  graphql do
    type :subscription_pause

    mutations do
      create :create_subscription_pause, :create
      update :update_subscription_pause, :update
      destroy :delete_subscription_pause, :destroy
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:subscription_pause]}
  end

  actions do
    defaults [:read]

    # Used internally by the suspend workflow.
    create :open do
      accept [:subscription_id, :start_date, :reason]
    end

    # Manually record a historical pause interval, e.g. for backfilling.
    create :create do
      accept [:subscription_id, :start_date, :end_date, :reason]
    end

    # Used internally by the resume/cancel workflows.
    update :close do
      accept [:end_date]
    end

    update :update do
      accept [:start_date, :end_date, :reason]
    end

    destroy :destroy
  end

  policies do
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    policy action_type(:read) do
      # Pauses are only readable via the subscription relationship.
      authorize_if Chironium.CRM.Checks.AccessedFromRelationship
    end

    policy action_type([:create, :update, :destroy]) do
      authorize_if actor_present()
    end
  end

  validations do
    validate compare(:end_date, greater_than: :start_date),
      message: "must be after the pause start date"
  end

  attributes do
    attribute :start_date, :date do
      allow_nil? false
      public? true
      default &Date.utc_today/0
    end

    attribute :end_date, :date do
      allow_nil? true
      public? true
    end

    attribute :reason, :string do
      allow_nil? true
      public? true
    end
  end

  relationships do
    belongs_to :subscription, Chironium.Subscriptions.Subscription do
      public? true
      allow_nil? false
    end
  end
end
