defmodule Mix.Tasks.MigrateAll do
  @moduledoc """
  Runs all database migrations: default (public) paths and tenant prefixes.

  Same behavior as `Chironium.Release.migrate_all/0`, used in release scripts,
  but callable via Mix in development (`mix migrate_all`).
  """
  use Mix.Task

  @shortdoc "Runs public and tenant migrations for all configured repos"

  @impl Mix.Task
  def run(_args) do
    Mix.Task.run("app.start")
    Chironium.Release.migrate_all()
  end
end
