defmodule Chironium.Automation.Rule do
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Automation,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshAdmin.Resource]

  postgres do
    repo Chironium.Repo
    table "automation_rules"
  end

  graphql do
    type :automation_rule

    mutations do
      create :create_automation_rule, :create
      update :update_automation_rule, :update
      destroy :delete_automation_rule, :destroy
    end

    queries do
      read_one :get_automation_rule, :read
      list :list_automation_rules, :read
    end
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
    uuid_v7_primary_key :id

    attribute :tenant_id, :string do
      allow_nil? false
      public? true
    end

    attribute :trigger_type, Chironium.Automation.Rule.TriggerType do
      allow_nil? false
      public? true
    end

    attribute :trigger_topic, :string do
      allow_nil? false
      public? true
    end

    attribute :conditions, :map do
      default %{}
      allow_nil? false
      public? true
    end

    attribute :action_type, Chironium.Automation.Rule.ActionType do
      allow_nil? false
      public? true
    end

    attribute :action_payload, :map do
      default %{}
      allow_nil? false
      public? true
    end

    attribute :is_active, :boolean do
      default true
      allow_nil? false
      public? true
    end

    create_timestamp :inserted_at
    update_timestamp :updated_at
  end
end
