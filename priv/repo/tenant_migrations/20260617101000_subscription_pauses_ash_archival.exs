defmodule Chironium.Repo.TenantMigrations.SubscriptionPausesAshArchival do
  @moduledoc """
  Soft-delete subscription pauses via AshArchival and exclude archived rows
  from the one-open-pause-per-subscription unique index.
  """

  use Ecto.Migration

  def up do
    alter table(:subscription_pauses, prefix: prefix()) do
      add :archived_at, :utc_datetime_usec
    end

    drop_if_exists index(:subscription_pauses, [:subscription_id],
                     name: "subscription_pauses_one_open_per_subscription"
                   )

    create unique_index(:subscription_pauses, [:subscription_id],
             name: "subscription_pauses_one_open_per_subscription",
             where: "end_date IS NULL AND archived_at IS NULL"
           )
  end

  def down do
    drop_if_exists index(:subscription_pauses, [:subscription_id],
                     name: "subscription_pauses_one_open_per_subscription"
                   )

    create unique_index(:subscription_pauses, [:subscription_id],
             name: "subscription_pauses_one_open_per_subscription",
             where: "end_date IS NULL"
           )

    alter table(:subscription_pauses, prefix: prefix()) do
      remove :archived_at
    end
  end
end
