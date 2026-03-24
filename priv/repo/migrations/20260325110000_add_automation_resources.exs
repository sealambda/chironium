defmodule Chironium.Repo.Migrations.AddAutomationResources do
  use Ecto.Migration

  def up do
    create table(:automation_rules, primary_key: false) do
      add :id, :uuid, null: false, default: fragment("uuidv7()"), primary_key: true
      add :tenant_id, :text, null: false
      add :trigger_type, :text, null: false
      add :trigger_topic, :text, null: false
      add :conditions, :map, null: false, default: %{}
      add :action_type, :text, null: false
      add :action_payload, :map, null: false, default: %{}
      add :is_active, :boolean, null: false, default: true

      add :inserted_at, :utc_datetime_usec,
        null: false,
        default: fragment("(now() AT TIME ZONE 'utc')")

      add :updated_at, :utc_datetime_usec,
        null: false,
        default: fragment("(now() AT TIME ZONE 'utc')")
    end

    create index(:automation_rules, [:tenant_id, :trigger_topic],
             name: "automation_rules_tenant_trigger_index"
           )

    create index(:automation_rules, [:is_active], name: "automation_rules_active_index")

    create table(:automation_execution_logs, primary_key: false) do
      add :id, :uuid, null: false, default: fragment("uuidv7()"), primary_key: true

      add :rule_id,
          references(:automation_rules,
            column: :id,
            name: "automation_execution_logs_rule_id_fkey",
            type: :uuid,
            prefix: "public"
          ),
          null: false

      add :status, :text, null: false, default: "pending"
      add :error_details, :text

      add :inserted_at, :utc_datetime_usec,
        null: false,
        default: fragment("(now() AT TIME ZONE 'utc')")

      add :updated_at, :utc_datetime_usec,
        null: false,
        default: fragment("(now() AT TIME ZONE 'utc')")
    end

    create index(:automation_execution_logs, [:rule_id],
             name: "automation_execution_logs_rule_id_index"
           )

    create index(:automation_execution_logs, [:status],
             name: "automation_execution_logs_status_index"
           )
  end

  def down do
    drop_if_exists index(:automation_execution_logs, [:status],
                     name: "automation_execution_logs_status_index"
                   )

    drop_if_exists index(:automation_execution_logs, [:rule_id],
                     name: "automation_execution_logs_rule_id_index"
                   )

    drop constraint(:automation_execution_logs, "automation_execution_logs_rule_id_fkey")

    drop table(:automation_execution_logs)

    drop_if_exists index(:automation_rules, [:is_active], name: "automation_rules_active_index")

    drop_if_exists index(:automation_rules, [:tenant_id, :trigger_topic],
                     name: "automation_rules_tenant_trigger_index"
                   )

    drop table(:automation_rules)
  end
end
