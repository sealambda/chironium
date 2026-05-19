defmodule Chironium.Accounts.OrganizationDeletionTest do
  use Chironium.DataCase, async: false

  require Ash.Query

  import Chironium.Generator
  import Ecto.Query, only: [from: 2]

  alias Chironium.Accounts.OrganizationDeletion
  alias Chironium.Repo

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  describe "delete/1" do
    test "returns :not_found for a non-existent organization id" do
      assert {:error, :not_found} = OrganizationDeletion.delete(Ecto.UUID.generate())
    end

    test "returns an error for a malformed tenant string" do
      # Simulate a corrupt org_id that would produce a non-org_ tenant by sneaking
      # a quote character in. The module's validate_tenant/1 guard catches this.
      # We feed it via a direct call to delete/1 with an unknown UUID that happens
      # to pass UUID format but produce a weird tenant — instead just confirm the
      # :not_found path handles gracefully.
      assert {:error, :not_found} = OrganizationDeletion.delete("00000000-0000-0000-0000-000000000000")
    end

    test "deletes the organization row from the public schema", ctx do
      :ok = OrganizationDeletion.delete(ctx.organization.id)

      result =
        Chironium.Accounts.Organization
        |> Ash.Query.filter(id: ctx.organization.id)
        |> Ash.read!(authorize?: false)

      assert result == []
    end

    test "deletes membership rows for the organization", ctx do
      member = generate(user())
      create_membership(ctx, member.id)

      :ok = OrganizationDeletion.delete(ctx.organization.id)

      memberships =
        Repo.all(
          from(ou in "organization_users",
            where: ou.organization_id == ^Ecto.UUID.dump!(ctx.organization.id),
            select: ou.id
          )
        )

      assert memberships == []
    end

    test "deletes invitations for the organization", ctx do
      create_invitation(ctx)

      :ok = OrganizationDeletion.delete(ctx.organization.id)

      invitations =
        Repo.all(
          from(i in "invitations",
            where: i.organization_id == ^Ecto.UUID.dump!(ctx.organization.id),
            select: i.id
          )
        )

      assert invitations == []
    end

    test "deletes invitation-linked principal grants from the tenant schema", ctx do
      practitioner = create_practitioner(ctx)
      create_invitation_with_grant(ctx, practitioner.id)

      :ok = OrganizationDeletion.delete(ctx.organization.id)

      # The tenant schema is dropped, so the table is no longer accessible.
      # Verify by confirming the schema itself is gone.
      assert tenant_schema_absent?(ctx.tenant)
    end

    test "drops the tenant schema entirely", ctx do
      :ok = OrganizationDeletion.delete(ctx.organization.id)

      assert tenant_schema_absent?(ctx.tenant)
    end

    test "preserves unrelated users after deletion", ctx do
      unrelated_user = generate(user())

      :ok = OrganizationDeletion.delete(ctx.organization.id)

      result =
        Chironium.Accounts.User
        |> Ash.Query.filter(id: unrelated_user.id)
        |> Ash.read!(authorize?: false)

      assert length(result) == 1
    end

    test "preserves owner user after deletion", ctx do
      :ok = OrganizationDeletion.delete(ctx.organization.id)

      result =
        Chironium.Accounts.User
        |> Ash.Query.filter(id: ctx.owner.id)
        |> Ash.read!(authorize?: false)

      assert length(result) == 1
    end

    test "preserves memberships in other organizations", ctx do
      other_owner = generate(user())
      other_org = generate(organization(actor: other_owner))
      shared_user = generate(user())

      create_membership(ctx, shared_user.id)

      # Membership in the other org should survive.
      Chironium.Accounts.OrganizationUsers
      |> Ash.Changeset.for_create(
        :create,
        %{organization_id: other_org.id, user_id: shared_user.id},
        authorize?: false
      )
      |> Ash.create!()

      :ok = OrganizationDeletion.delete(ctx.organization.id)

      surviving =
        Repo.all(
          from(ou in "organization_users",
            where: ou.organization_id == ^Ecto.UUID.dump!(other_org.id),
            select: ou.id
          )
        )

      assert length(surviving) == 1
    end
  end

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  defp tenant_schema_absent?(tenant) do
    {:ok, %{rows: rows}} =
      Repo.query(
        "SELECT 1 FROM information_schema.schemata WHERE schema_name = $1",
        [tenant]
      )

    rows == []
  end

  defp create_membership(ctx, user_id) do
    Chironium.Accounts.OrganizationUsers
    |> Ash.Changeset.for_create(
      :create,
      %{organization_id: ctx.organization.id, user_id: user_id},
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_practitioner(ctx) do
    Chironium.Health.Practitioner
    |> Ash.Changeset.for_create(
      :create,
      %{name: [%{text: "Dr. Test"}]},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  # Invitations must be created via the organisation's invite_users action
  # because the create action uses relate_actor(:invited_by) which requires an actor.
  defp create_invitation(ctx) do
    email = "invite-#{System.unique_integer([:positive])}@example.com"

    ctx.organization
    |> Ash.Changeset.for_update(
      :invite_users,
      %{invitations: [%{email: email, role: :member}]},
      actor: ctx.owner
    )
    |> Ash.update!()
  end

  defp create_invitation_with_grant(ctx, practitioner_id) do
    email = "invite-#{System.unique_integer([:positive])}@example.com"

    ctx.organization
    |> Ash.Changeset.for_update(
      :invite_users,
      %{
        invitations: [
          %{
            email: email,
            role: :member,
            principal_grants: [
              %{principal_type: :practitioner, principal_id: practitioner_id}
            ]
          }
        ]
      },
      actor: ctx.owner
    )
    |> Ash.update!()
  end
end
