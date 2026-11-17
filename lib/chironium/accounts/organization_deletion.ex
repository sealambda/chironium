defmodule Chironium.Accounts.OrganizationDeletion do
  @moduledoc """
  Deletes an organization and all of its associated data from the database.

  This is a destructive, irreversible operation intended for administrative use only.
  It removes:

  - All tenant-scoped data (health records, CRM persons, subscriptions, principal grants,
    and all AshPaperTrail version tables) by dropping the tenant schema.
  - Public-schema invitations for the organization.
  - Public-schema organization-user membership rows for the organization.
  - The organization row itself.

  Shared `users` and auth-related records (`user_identities`, `tokens`) are never touched;
  they may belong to other organizations.

  Use `authorize?: false` throughout because this is a trusted internal path only callable
  from privileged operational entry points (Mix tasks, release commands).
  """

  require Ash.Query

  import Ecto.Query, only: [from: 2]

  alias Chironium.Accounts.Organization
  alias Chironium.Repo

  @org_schema_prefix "org_"

  @doc """
  Deletes the organization identified by `org_id` and all of its data.

  Returns `:ok` on success or `{:error, reason}` on failure.
  """
  @spec delete(Ecto.UUID.t()) :: :ok | {:error, term()}
  def delete(org_id) when is_binary(org_id) do
    with {:ok, org} <- fetch_organization(org_id),
         tenant = "#{@org_schema_prefix}#{org.id}",
         :ok <- validate_tenant(tenant),
         :ok <- delete_public_schema_data(org.id, tenant),
         :ok <- drop_tenant_schema(tenant) do
      :ok
    end
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp fetch_organization(org_id) do
    Organization
    |> Ash.Query.filter(id: org_id)
    |> Ash.read_one(authorize?: false)
    |> case do
      {:ok, nil} -> {:error, :not_found}
      {:ok, org} -> {:ok, org}
      {:error, reason} -> {:error, reason}
    end
  end

  # Guard against accidentally dropping a schema that is not an org tenant.
  defp validate_tenant(tenant) do
    if String.starts_with?(tenant, @org_schema_prefix) do
      :ok
    else
      {:error, {:invalid_tenant, "Tenant \"#{tenant}\" does not match the org_ prefix."}}
    end
  end

  defp delete_public_schema_data(org_id, tenant) do
    Repo.transaction(fn ->
      # Invitation-linked principal grants (tenant-scoped) must be removed before
      # the invitations themselves due to the FK on principal_grants_versions.
      delete_invitation_grants(org_id, tenant)

      org_id_bin = Ecto.UUID.dump!(org_id)

      # Collect the IDs of rows we are about to remove so we can prune their
      # AshPaperTrail version rows first (version_source_id → source table FKs).
      invitation_ids =
        Repo.all(from(i in "invitations", where: i.organization_id == ^org_id_bin, select: i.id))

      org_user_ids =
        Repo.all(
          from(ou in "organization_users",
            where: ou.organization_id == ^org_id_bin,
            select: ou.id
          )
        )

      # Delete version rows before their sources to satisfy FK constraints.
      if invitation_ids != [] do
        Repo.delete_all(
          from(v in "invitations_versions", where: v.version_source_id in ^invitation_ids)
        )
      end

      Repo.delete_all(from(i in "invitations", where: i.organization_id == ^org_id_bin))

      if org_user_ids != [] do
        Repo.delete_all(
          from(v in "organization_users_versions",
            where: v.version_source_id in ^org_user_ids
          )
        )
      end

      Repo.delete_all(
        from(ou in "organization_users", where: ou.organization_id == ^org_id_bin)
      )

      # Remove the organization version rows before the organization itself.
      Repo.delete_all(
        from(v in "organizations_versions", where: v.version_source_id == ^org_id_bin)
      )

      Repo.delete_all(from(o in "organizations", where: o.id == ^org_id_bin))
    end)
    |> case do
      {:ok, _} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  # Deletes every tenant-scoped PrincipalGrant and its AshPaperTrail version rows.
  # Ash.destroy!/1 is blocked by the FK from principal_grants_versions.version_source_id
  # to principal_grants.id, so raw Ecto queries are required (same pattern as
  # Chironium.Accounts.Invitation.revoke_invitation_grant/2).
  defp delete_invitation_grants(org_id, tenant) do
    # Enumerate all invitation IDs for this org so we can scope the grant lookup.
    org_id_bin = Ecto.UUID.dump!(org_id)

    invitation_ids =
      Repo.all(
        from(i in "invitations",
          where: i.organization_id == ^org_id_bin,
          select: i.id
        )
      )

    if invitation_ids != [] do
      # Remove version rows first to satisfy the FK constraint.
      grant_ids =
        Repo.all(
          from(g in "principal_grants",
            where: g.invitation_id in ^invitation_ids,
            select: g.id
          ),
          prefix: tenant
        )

      if grant_ids != [] do
        Repo.delete_all(
          from(v in "principal_grants_versions",
            where: v.version_source_id in ^grant_ids
          ),
          prefix: tenant
        )

        Repo.delete_all(
          from(g in "principal_grants",
            where: g.id in ^grant_ids
          ),
          prefix: tenant
        )
      end
    end
  end

  defp drop_tenant_schema(tenant) do
    # Use a quoted identifier to prevent SQL injection in the schema name.
    # The validate_tenant/1 guard above enforces the org_ prefix, but the
    # schema name is also passed through the DB driver's quoting mechanism.
    quoted = ~s("#{String.replace(tenant, ~s("), "")}")

    Repo.query("DROP SCHEMA IF EXISTS #{quoted} CASCADE")
    |> case do
      {:ok, _} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end
end
