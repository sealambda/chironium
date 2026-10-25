defmodule Chironium.Demo.Cleanup do
  @moduledoc """
  Deletes demo organizations and users with plain SQL, in foreign key order.

  Ash destroys would write new version rows pointing at the records being
  deleted, and `User` has no destroy action.
  """

  alias Chironium.Demo
  alias Chironium.Repo

  # Timestamps are stored in UTC without a zone, so `now()` is shifted to UTC first.
  @older_than_a_day "inserted_at < (now() AT TIME ZONE 'utc') - interval '24 hours'"

  @doc """
  IDs of organizations older than 24 hours whose owner and members are all demo
  users. A single real owner or member keeps the organization.
  """
  def due_organizations do
    ids("""
    SELECT o.id::text FROM organizations o
    JOIN users owner ON owner.id = o.owner_id
    WHERE o.#{@older_than_a_day}
      AND owner.email LIKE $1
      AND NOT EXISTS (
        SELECT 1 FROM organization_users ou JOIN users u ON u.id = ou.user_id
        WHERE ou.organization_id = o.id AND u.email NOT LIKE $1
      )
    """)
  end

  @doc """
  IDs of demo users older than 24 hours who own no organization and belong to
  none. The age rule spares a user whose demo is still being created.
  """
  def due_users do
    ids("""
    SELECT u.id::text FROM users u
    WHERE u.#{@older_than_a_day}
      AND u.email LIKE $1
      AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.owner_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM organization_users ou WHERE ou.user_id = u.id)
    """)
  end

  defp ids(sql), do: Enum.map(Repo.query!(sql, [Demo.email_pattern()]).rows, &hd/1)

  @doc "Deletes an organization, its database schema and everything public that points at it."
  def delete_organization(id) do
    uuid = Ecto.UUID.dump!(id)

    Repo.transaction(fn ->
      # The ID is a UUID cast above, so interpolating it is safe.
      Repo.query!(~s(DROP SCHEMA IF EXISTS "org_#{Ecto.UUID.cast!(id)}" CASCADE))

      %{rows: guest_ids} =
        Repo.query!("SELECT id::text FROM guest_accesses WHERE organization_id = $1", [uuid])

      Repo.query!("DELETE FROM tokens WHERE subject = ANY($1)", [
        Enum.map(guest_ids, fn [guest_id] -> "guest?id=" <> guest_id end)
      ])

      for sql <- [
            "DELETE FROM guest_accesses_versions WHERE version_source_id IN (SELECT id FROM guest_accesses WHERE organization_id = $1)",
            "DELETE FROM guest_accesses WHERE organization_id = $1",
            "DELETE FROM invitations_versions WHERE version_source_id IN (SELECT id FROM invitations WHERE organization_id = $1)",
            "DELETE FROM invitations WHERE organization_id = $1",
            "DELETE FROM organization_users_versions WHERE version_source_id IN (SELECT id FROM organization_users WHERE organization_id = $1)",
            "DELETE FROM organization_users WHERE organization_id = $1",
            "DELETE FROM organizations_versions WHERE version_source_id = $1",
            "DELETE FROM organizations WHERE id = $1"
          ] do
        Repo.query!(sql, [uuid])
      end
    end)

    :ok
  end

  @doc """
  Deletes a user, their own history, identities and tokens. Returns
  `{:error, constraint}` and deletes nothing when a kept record still references the user.
  """
  def delete_user(id) do
    uuid = Ecto.UUID.dump!(id)

    result =
      Repo.transaction(fn ->
        Repo.query!("DELETE FROM users_versions WHERE version_source_id = $1", [uuid])
        Repo.query!("DELETE FROM user_identities WHERE user_id = $1", [uuid])
        Repo.query!("DELETE FROM tokens WHERE subject = $1", ["user?id=" <> id])

        case Repo.query("DELETE FROM users WHERE id = $1", [uuid]) do
          {:ok, _} ->
            :ok

          {:error, %Postgrex.Error{postgres: %{code: :foreign_key_violation} = error}} ->
            Repo.rollback(error.constraint)
        end
      end)

    with {:ok, :ok} <- result, do: :ok
  end
end
