defmodule Chironium.Accounts.Changes.MigrateTenant do
  @moduledoc """
  Runs tenant migrations after creating an organization.
  """
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    Ash.Changeset.after_action(changeset, fn _changeset, organization ->
      tenant = "org_#{organization.id}"

      # Run tenant migrations for the new schema.
      path = Application.app_dir(:chironium, "priv/repo/tenant_migrations")

      Ecto.Migrator.run(
        Chironium.Repo,
        path,
        :up,
        all: true,
        prefix: tenant
      )

      {:ok, organization}
    end)
  end
end
