defmodule Chironium.Demo.Cleanup do
  @moduledoc """
  Deletes demo organizations and users with plain SQL, in foreign key order.

  Ash destroys would write new version rows pointing at the records being
  deleted, and `User` has no destroy action.
  """

  alias Chironium.Repo

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
