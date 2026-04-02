defmodule Chironium.Accounts.InvitationPrincipalGrantTest do
  use Chironium.DataCase, async: false

  require Ash.Query

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  # ---------------------------------------------------------------------------
  # Happy path
  # ---------------------------------------------------------------------------

  describe "invitation with principal grants" do
    test "accept converts pending grants to user-linked grants", ctx do
      practitioner = create_practitioner(ctx)
      invitee = generate(user())

      invite = create_invitation(ctx, invitee.email, [{:practitioner, practitioner.id}])

      {:ok, _} = Ash.update(invite, %{}, action: :accept, actor: invitee)

      grants =
        Chironium.Accounts.PrincipalGrant
        |> Ash.Query.filter(user_id: invitee.id, principal_type: :practitioner)
        |> Ash.read!(authorize?: false, tenant: ctx.tenant)

      assert length(grants) == 1
      grant = hd(grants)
      assert grant.principal_id == practitioner.id
      assert grant.active
      assert is_nil(grant.invitation_id)
    end

    test "accept with multiple grants links them all to the user", ctx do
      prac_a = create_practitioner(ctx)
      prac_b = create_practitioner(ctx)
      invitee = generate(user())

      invite =
        create_invitation(ctx, invitee.email, [
          {:practitioner, prac_a.id},
          {:practitioner, prac_b.id}
        ])

      {:ok, _} = Ash.update(invite, %{}, action: :accept, actor: invitee)

      grants =
        Chironium.Accounts.PrincipalGrant
        |> Ash.Query.filter(user_id: invitee.id)
        |> Ash.read!(authorize?: false, tenant: ctx.tenant)

      assert length(grants) == 2
      grant_ids = Enum.map(grants, & &1.principal_id) |> MapSet.new()
      assert MapSet.member?(grant_ids, prac_a.id)
      assert MapSet.member?(grant_ids, prac_b.id)
    end

    test "accept also creates the OrganizationUsers membership", ctx do
      practitioner = create_practitioner(ctx)
      invitee = generate(user())

      invite = create_invitation(ctx, invitee.email, [{:practitioner, practitioner.id}])

      {:ok, _} = Ash.update(invite, %{}, action: :accept, actor: invitee)

      memberships =
        Chironium.Accounts.OrganizationUsers
        |> Ash.Query.filter(user_id: invitee.id, organization_id: ctx.organization.id)
        |> Ash.read!(authorize?: false)

      assert length(memberships) == 1
    end

    test "no invitation-linked grants remain after acceptance", ctx do
      practitioner = create_practitioner(ctx)
      invitee = generate(user())

      invite = create_invitation(ctx, invitee.email, [{:practitioner, practitioner.id}])

      {:ok, _} = Ash.update(invite, %{}, action: :accept, actor: invitee)

      pending =
        Chironium.Accounts.PrincipalGrant
        |> Ash.Query.filter(invitation_id: invite.id)
        |> Ash.read!(authorize?: false, tenant: ctx.tenant)

      assert pending == []
    end

    test "accept is idempotent when the user already has a matching grant (re-invitation)", ctx do
      practitioner = create_practitioner(ctx)
      invitee = generate(user())

      # First invitation and acceptance.
      invite1 = create_invitation(ctx, invitee.email, [{:practitioner, practitioner.id}])
      {:ok, _} = Ash.update(invite1, %{}, action: :accept, actor: invitee)

      # Re-invitation after archival.
      invite2 = create_invitation(ctx, invitee.email, [{:practitioner, practitioner.id}])
      {:ok, _} = Ash.update(invite2, %{}, action: :accept, actor: invitee)

      grants =
        Chironium.Accounts.PrincipalGrant
        |> Ash.Query.filter(user_id: invitee.id, principal_type: :practitioner)
        |> Ash.read!(authorize?: false, tenant: ctx.tenant)

      # Upsert must not create a duplicate grant.
      assert length(grants) == 1
    end
  end

  # ---------------------------------------------------------------------------
  # Backward compatibility — invitation without principal grants
  # ---------------------------------------------------------------------------

  describe "invitation without principal grants" do
    test "accept does not create any PrincipalGrant", ctx do
      invitee = generate(user())

      invite = create_plain_invitation(ctx, invitee.email)

      {:ok, _} = Ash.update(invite, %{}, action: :accept, actor: invitee)

      grants =
        Chironium.Accounts.PrincipalGrant
        |> Ash.Query.filter(user_id: invitee.id)
        |> Ash.read!(authorize?: false, tenant: ctx.tenant)

      assert grants == []
    end
  end

  # ---------------------------------------------------------------------------
  # Reject path — grants must NOT be converted
  # ---------------------------------------------------------------------------

  describe "rejecting a principal-grant invitation" do
    test "pending grants remain invitation-linked and are not converted", ctx do
      practitioner = create_practitioner(ctx)
      invitee = generate(user())

      invite = create_invitation(ctx, invitee.email, [{:practitioner, practitioner.id}])

      {:ok, _} = Ash.update(invite, %{}, action: :reject, actor: invitee)

      user_grants =
        Chironium.Accounts.PrincipalGrant
        |> Ash.Query.filter(user_id: invitee.id)
        |> Ash.read!(authorize?: false, tenant: ctx.tenant)

      assert user_grants == []
    end
  end

  # ---------------------------------------------------------------------------
  # Security — validation at creation time
  # ---------------------------------------------------------------------------

  describe "creating an invitation with an invalid principal grant" do
    test "fails when the practitioner belongs to a different organization", ctx do
      other_owner = generate(user())
      other_org = generate(organization(actor: other_owner))
      other_tenant = "org_#{other_org.id}"

      foreign_practitioner =
        Chironium.Health.Practitioner
        |> Ash.Changeset.for_create(
          :create,
          %{name: [%{text: "Dr. Outsider"}]},
          authorize?: false,
          tenant: other_tenant
        )
        |> Ash.create!()

      assert {:error, _} =
               ctx.organization
               |> Ash.Changeset.for_update(
                 :invite_users,
                 %{
                   invitations: [
                     %{
                       email: "crossorg@example.com",
                       role: :member,
                       principal_grants: [
                         %{principal_type: :practitioner, principal_id: foreign_practitioner.id}
                       ]
                     }
                   ]
                 },
                 actor: ctx.owner
               )
               |> Ash.update()
    end

    test "fails when the referenced practitioner does not exist", ctx do
      nonexistent_id = Ash.UUID.generate()

      assert {:error, _} =
               ctx.organization
               |> Ash.Changeset.for_update(
                 :invite_users,
                 %{
                   invitations: [
                     %{
                       email: "ghost@example.com",
                       role: :member,
                       principal_grants: [
                         %{principal_type: :practitioner, principal_id: nonexistent_id}
                       ]
                     }
                   ]
                 },
                 actor: ctx.owner
               )
               |> Ash.update()
    end
  end

  # ---------------------------------------------------------------------------
  # Security — access control
  # ---------------------------------------------------------------------------

  describe "access control" do
    test "a regular member cannot create an invitation", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)

      assert {:error, %Ash.Error.Forbidden{}} =
               ctx.organization
               |> Ash.Changeset.for_update(
                 :invite_users,
                 %{invitations: [%{email: "newbie@example.com", role: :member}]},
                 actor: member
               )
               |> Ash.update()
    end
  end

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  defp create_membership(organization_id, user_id, role) do
    Chironium.Accounts.OrganizationUsers
    |> Ash.Changeset.for_create(
      :create,
      %{organization_id: organization_id, user_id: user_id, role: role},
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

  # Creates an invitation with one or more principal grants.
  # `grants` is a list of `{principal_type, principal_id}` tuples.
  defp create_invitation(ctx, email, grants) do
    principal_grants =
      Enum.map(grants, fn {type, id} -> %{principal_type: type, principal_id: id} end)

    ctx.organization
    |> Ash.Changeset.for_update(
      :invite_users,
      %{
        invitations: [%{email: email, role: :member, principal_grants: principal_grants}]
      },
      actor: ctx.owner
    )
    |> Ash.update!()

    Chironium.Accounts.Invitation
    |> Ash.Query.filter(email: email)
    |> Ash.read_one!(authorize?: false)
  end

  # Creates a plain invitation with no principal grants.
  defp create_plain_invitation(ctx, email) do
    ctx.organization
    |> Ash.Changeset.for_update(
      :invite_users,
      %{invitations: [%{email: email, role: :member}]},
      actor: ctx.owner
    )
    |> Ash.update!()

    Chironium.Accounts.Invitation
    |> Ash.Query.filter(email: email)
    |> Ash.read_one!(authorize?: false)
  end
end
