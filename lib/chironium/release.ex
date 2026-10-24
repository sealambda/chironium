defmodule Chironium.Release do
  @moduledoc """
  Used for executing DB release tasks when run in production without Mix installed.

  https://hexdocs.pm/ash_postgres/migrations-and-tasks.html#running-migrations-in-production
  """
  @app :chironium

  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  # only needed if you are using postgres multitenancy
  def migrate_tenants do
    load_app()

    for repo <- repos() do
      path = Ecto.Migrator.migrations_path(repo, "tenant_migrations")
      # This may be different for you if you are not using the default tenant migrations

      {:ok, _, _} =
        Ecto.Migrator.with_repo(
          repo,
          fn repo ->
            for tenant <- repo.all_tenants() do
              Ecto.Migrator.run(repo, path, :up, all: true, prefix: tenant)
            end
          end
        )
    end
  end

  # only needed if you are using postgres multitenancy
  def migrate_all do
    load_app()
    migrate()
    migrate_tenants()
  end

  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  # only needed if you are using postgres multitenancy
  def rollback_tenants(repo, version) do
    load_app()

    path = Ecto.Migrator.migrations_path(repo, "tenant_migrations")
    # This may be different for you if you are not using the default tenant migrations

    for tenant <- repo.all_tenants() do
      {:ok, _, _} =
        Ecto.Migrator.with_repo(
          repo,
          &Ecto.Migrator.run(&1, path, :down,
            to: version,
            prefix: tenant
          )
        )
    end
  end

  # -- Seed --
  # Run in production via:
  #   ./chironium eval 'Chironium.Release.seed()'
  #   ./chironium eval 'Chironium.Release.seed(patients: 100, invite: "admin@example.com", role: :power_user)'

  def seed(opts \\ []) do
    start_app()

    alias Mix.Tasks.Chironium.Seed.{All, Organization}

    patient_count = Keyword.get(opts, :patients, 50)
    practitioner_count = Keyword.get(opts, :practitioners, 10)
    invite_email = Keyword.get(opts, :invite)
    role = Keyword.get(opts, :role, :power_user)

    {user, org, tenant} = Organization.seed()
    IO.puts("[Seed] Organization '#{org.name}' created (tenant: #{tenant}).")

    All.seed(tenant, patients: patient_count, practitioners: practitioner_count, log: &IO.puts/1)

    invite = Organization.seed_invitation(org, user, invite_email, role)

    if invite_email do
      IO.puts("[Seed] Invitation sent to #{invite.email} with role '#{invite.role}'.")
    else
      IO.puts("[Seed] Invite code: #{invite.invite_code} (role: #{invite.role})")
    end

    IO.puts("[Seed] Done. User email: #{user.email}")
  end

  # -- Terminology imports --
  # Run as one-off commands in production via:
  #   ./chironium eval 'Chironium.Release.import_loinc("/data/loinc")'
  #   ./chironium eval 'Chironium.Release.import_loinc("/data/loinc", version: "2.82", force: true)'

  def import_loinc(path, opts \\ []) do
    start_app()
    Chironium.Terminology.Importer.Loinc.run(path, opts)
  end

  def import_snomed(path, opts \\ []) do
    start_app()
    Chironium.Terminology.Importer.Snomed.run(path, opts)
  end

  def import_snomed_spanish(path, opts \\ []) do
    start_app()
    Chironium.Terminology.Importer.Snomed.run_spanish_extension(path, opts)
  end

  defp start_app do
    load_app()
    Application.ensure_all_started(@app)
  end

  defp repos do
    domains()
    |> Enum.flat_map(fn domain ->
      domain
      |> Ash.Domain.Info.resources()
      |> Enum.map(&AshPostgres.DataLayer.Info.repo/1)
      |> Enum.reject(&is_nil/1)
    end)
    |> Enum.uniq()
  end

  defp domains do
    Application.fetch_env!(@app, :ash_domains)
  end

  defp load_app do
    # Many platforms require SSL when connecting to the database
    Application.ensure_all_started(:ssl)
    Application.ensure_loaded(@app)
  end
end
