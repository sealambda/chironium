defmodule Chironium.Automation.ExecutionLog do
  use Ash.Resource,
    otp_app: :chironium,
    domain: Chironium.Automation,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshAdmin.Resource]

  postgres do
    repo Chironium.Repo
    table "automation_execution_logs"
  end

  graphql do
    type :automation_execution_log

    mutations do
      create :create_automation_execution_log, :create
      update :update_automation_execution_log, :update
      destroy :delete_automation_execution_log, :destroy
    end

    queries do
      read_one :get_automation_execution_log, :read
      list :list_automation_execution_logs, :read
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

    attribute :rule_id, :uuid do
      allow_nil? false
      public? true
    end

    attribute :status, Chironium.Automation.ExecutionLog.Status do
      allow_nil? false
      default :pending
      public? true
    end

    attribute :error_details, :string do
      public? true
    end

    create_timestamp :inserted_at
    update_timestamp :updated_at
  end
end
