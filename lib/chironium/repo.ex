defmodule Chironium.Repo do
  @moduledoc """
  The Ecto repository for Chironium.

  Uses AshPostgres with PostgreSQL 18+ and includes extensions for
  Ash functions, case-insensitive text, and money types.
  """
  use AshPostgres.Repo,
    otp_app: :chironium

  import Ecto.Query

  @impl true
  def installed_extensions do
    # Add extensions here, and the migration generator will install them.
    ["ash-functions", "citext", AshMoney.AshPostgresExtension]
  end

  # Don't open unnecessary transactions
  # will default to `false` in 4.0
  @impl true
  def prefer_transaction? do
    false
  end

  @impl true
  def min_pg_version do
    %Version{major: 18, minor: 0, patch: 0}
  end

  @doc """
  Required for schema-based multitenancy

  https://hexdocs.pm/ash_postgres/schema-based-multitenancy.html
  """
  @impl true
  def all_tenants do
    all(from(row in "organizations", select: fragment("? || ?", "org_", row.id)))
  end
end
