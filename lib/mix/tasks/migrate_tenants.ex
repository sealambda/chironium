defmodule Mix.Tasks.MigrateTenants do
  @moduledoc """
  Runs tenant migrations for all existing organizations.
  """
  @shortdoc "Migrates all tenant schemas"

  use Mix.Task

  @requirements ["app.start"]

  @impl Mix.Task
  def run(_args) do
    path = Application.app_dir(:chironium, "priv/repo/tenant_migrations")

    tenants = Chironium.Repo.all_tenants()

    IO.puts("Found #{length(tenants)} tenant(s) to migrate...")

    for tenant <- tenants do
      IO.puts("Migrating tenant: #{tenant}")

      Ecto.Migrator.run(
        Chironium.Repo,
        path,
        :up,
        all: true,
        prefix: tenant
      )
    end

    IO.puts("Done!")
  end
end
