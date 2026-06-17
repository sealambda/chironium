defmodule Chironium.Subscriptions.Subscription do
  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Subscriptions,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [
      AshGraphql.Resource,
      AshPaperTrail.Resource,
      AshStateMachine,
      AshArchival.Resource
    ]

  postgres do
    table "subscriptions"
  end

  graphql do
    type :subscription

    queries do
      list :list_subscriptions, :read
    end

    mutations do
      create :create_subscription, :create
      update :update_subscription, :update_subscription
      update :suspend_subscription, :suspend
      update :resume_subscription, :resume
      update :cancel_subscription, :cancel
      update :expire_subscription, :expire
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:subscription]}
  end

  state_machine do
    initial_states [:active]
    default_initial_state :active

    transitions do
      transition :expire, from: :active, to: :expired
      transition :suspend, from: :active, to: :suspended
      transition :cancel, from: [:active, :suspended], to: :canceled
      transition :resume, from: [:suspended, :expired, :canceled], to: :active
    end
  end

  actions do
    defaults [:read, :destroy, create: [:subscriber_id, :plan_id, :start_date]]

    create :create_with_new_subscriber do
      argument :subscriber, :map do
        allow_nil? false
      end

      accept [:start_date]
      change manage_relationship(:subscriber, type: :create)
    end

    update :update_subscription do
      accept [:plan_id, :start_date]
    end

    update :expire do
      change transition_state(:expired)
    end

    update :suspend do
      require_atomic? false

      argument :reason, :string do
        allow_nil? true
      end

      argument :suspended_at, :date do
        default &Date.utc_today/0
        allow_nil? false
      end

      validate Chironium.Subscriptions.Validations.ValidateSuspendedAt

      change transition_state(:suspended)
      change Chironium.Subscriptions.Changes.OpenPause
    end

    update :cancel do
      require_atomic? false

      argument :end_date, :date do
        default &Date.utc_today/0
        allow_nil? false
      end

      change Chironium.Subscriptions.Changes.ClosePause
      change transition_state(:canceled)
    end

    update :resume do
      require_atomic? false

      argument :end_date, :date do
        default &Date.utc_today/0
        allow_nil? false
      end

      validate Chironium.Subscriptions.Validations.ValidateResumedAt

      change transition_state(:active)
      change Chironium.Subscriptions.Changes.ClosePause
    end
  end

  policies do
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if Chironium.CRM.Checks.AccessedFromRelationship
      authorize_if Chironium.Subscriptions.Checks.SubscriptionVisibleToActor
    end

    policy action_type([:create, :update, :destroy]) do
      authorize_if actor_present()
    end
  end

  attributes do
    attribute :start_date, :date do
      allow_nil? false
      public? true
      default &Date.utc_today/0
    end
  end

  calculations do
    calculate :effective_end_date, :date, Chironium.Subscriptions.Calculations.EffectiveEndDate do
      public? true
    end
  end

  relationships do
    belongs_to :subscriber, Chironium.CRM.Person do
      public? true
      allow_nil? false
    end

    belongs_to :plan, Chironium.Subscriptions.Plan do
      public? true
      allow_nil? false
    end

    has_many :pauses, Chironium.Subscriptions.SubscriptionPause do
      public? true
    end
  end
end
