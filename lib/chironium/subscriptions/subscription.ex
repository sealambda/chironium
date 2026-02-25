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

      change manage_relationship(:subscriber, type: :create)
    end

    update :expire do
      change transition_state(:expired)
    end

    update :suspend do
      # TODO Record the access interval
      change transition_state(:suspended)
    end

    update :cancel do
      change transition_state(:canceled)
    end

    update :resume do
      change transition_state(:active)
    end
  end

  # TODO: Add policies
  policies do
    policy always() do
      authorize_if always()
    end
  end

  attributes do
    attribute :start_date, :date do
      allow_nil? false
      public? true
      default &Date.utc_today/0
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
  end
end
