defmodule Chironium.AccountsTest do
  require Ash.Query
  use Chironium.DataCase
  import Chironium.Generator

  # -- Helpers -----------------------------------------------------------------

  defp create_power_user_membership(organization_id, user_id) do
    Chironium.Accounts.OrganizationUsers
    |> Ash.Changeset.for_create(
      :create,
      %{organization_id: organization_id, user_id: user_id, role: :power_user},
      authorize?: false
    )
    |> Ash.create!()
  end

  # -- User --------------------------------------------------------------------

  describe "user" do
    test "can be seeded" do
      user = generate(user())
      assert user.email |> Ash.CiString.to_comparable_string() == "user-0@example.com"
    end

    test "can create an organization" do
      actor = generate(user())
      org = generate(organization(actor: actor))

      new_org = Ash.get!(Chironium.Accounts.Organization, org.id, actor: actor)
      assert new_org.name == org.name
      assert new_org.slug == org.slug
    end

    test "cannot see another user's organization" do
      actor = generate(user())
      org = generate(organization(actor: actor))

      other_user = generate(user())

      assert_raise Ash.Error.Invalid, fn ->
        Ash.get!(Chironium.Accounts.Organization, org.id, actor: other_user)
      end
    end
  end

  # -- Power user (org owner or member with :power_user role) ------------------

  describe "power user" do
    setup do
      owner = generate(user())
      org = generate(organization(actor: owner))
      %{owner: owner, org: org}
    end

    test "can list organization members", %{owner: owner, org: org} do
      org_with_relations = Ash.load!(org, [:owner, :users], actor: owner)
      assert org_with_relations.owner.id == owner.id
      assert org_with_relations.users == []
    end

    test "sees invited users as members after they accept", %{owner: owner, org: org} do
      member = generate(user())

      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: member.email}]},
        actor: owner
      )
      |> Ash.update!()

      {:ok, [invitation]} =
        Chironium.Accounts.find_current_email_invitations(actor: member)

      {:ok, _} = Chironium.Accounts.accept_invitation(invitation.invite_code, actor: member)

      org_with_users =
        Ash.get!(Chironium.Accounts.Organization, org.id, actor: owner, load: [:owner, :users])

      assert org_with_users.owner.id == owner.id
      assert [loaded_member] = org_with_users.users
      assert loaded_member.id == member.id
    end

    test "owner can invite a new member", %{owner: owner, org: org} do
      new_user = generate(user())

      assert {:ok, _} =
               org
               |> Ash.Changeset.for_update(
                 :invite_users,
                 %{invitations: [%{email: new_user.email}]},
                 actor: owner
               )
               |> Ash.update()
    end

    test "member with power_user role can invite a new member", %{org: org} do
      power_user = generate(user())
      create_power_user_membership(org.id, power_user.id)

      new_user = generate(user())

      assert {:ok, _} =
               org
               |> Ash.Changeset.for_update(
                 :invite_users,
                 %{invitations: [%{email: new_user.email}]},
                 actor: power_user
               )
               |> Ash.update()
    end
  end

  # -- Regular member ----------------------------------------------------------

  describe "member" do
    setup do
      owner = generate(user())
      org = generate(organization(actor: owner))
      member = generate(user())

      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: member.email}]},
        actor: owner
      )
      |> Ash.update!()

      {:ok, [invitation]} =
        Chironium.Accounts.find_current_email_invitations(actor: member)

      {:ok, _} = Chironium.Accounts.accept_invitation(invitation.invite_code, actor: member)

      %{owner: owner, org: org, member: member}
    end

    test "can list multiple organization members", %{owner: owner, org: org, member: member} do
      second_member = generate(user())

      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: second_member.email}]},
        actor: owner
      )
      |> Ash.update!()

      {:ok, [invitation]} =
        Chironium.Accounts.find_current_email_invitations(actor: second_member)

      {:ok, _} =
        Chironium.Accounts.accept_invitation(invitation.invite_code, actor: second_member)

      org_with_users =
        Ash.get!(Chironium.Accounts.Organization, org.id, actor: member, load: [:owner, :users])

      assert org_with_users.owner.id == owner.id
      member_ids = Enum.map(org_with_users.users, & &1.id) |> Enum.sort()
      assert member_ids == Enum.sort([member.id, second_member.id])
    end

    test "cannot invite a new member", %{org: org, member: member} do
      new_user = generate(user())

      assert {:error, %Ash.Error.Forbidden{}} =
               org
               |> Ash.Changeset.for_update(
                 :invite_users,
                 %{invitations: [%{email: new_user.email}]},
                 actor: member
               )
               |> Ash.update()
    end

    test "non-member cannot list organization members", %{org: org} do
      outsider = generate(user())

      assert_raise Ash.Error.Invalid, fn ->
        Ash.get!(Chironium.Accounts.Organization, org.id, actor: outsider)
      end
    end
  end

  # -- Invitation flow ---------------------------------------------------------

  describe "invitation flow" do
    test "invitee can accept an invitation" do
      actor = generate(user())
      org = generate(organization(actor: actor))
      other_user = generate(user())

      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: other_user.email}]},
        actor: actor
      )
      |> Ash.update!()

      {:ok, [invitation]} =
        Chironium.Accounts.find_current_email_invitations(actor: other_user)

      assert {:ok, _accepted_invitation} =
               Chironium.Accounts.accept_invitation(invitation.invite_code, actor: other_user)

      membership =
        Chironium.Accounts.OrganizationUsers
        |> Ash.Query.filter(organization_id: org.id, user_id: other_user.id)
        |> Ash.read_one!(actor: other_user)

      assert membership.role == :member

      Ash.get!(Chironium.Accounts.Organization, org.id, actor: other_user)
    end

    test "cannot accept an invitation with an invalid code" do
      actor = generate(user())
      org = generate(organization(actor: actor))

      other_user = generate(user())

      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: other_user.email}]},
        actor: actor
      )
      |> Ash.update!()

      assert {:error, _error} =
               Chironium.Accounts.accept_invitation("INVALID", actor: other_user)
    end

    test "invitee can reject an invitation" do
      actor = generate(user())
      org = generate(organization(actor: actor))

      other_user = generate(user())

      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: other_user.email}]},
        actor: actor
      )
      |> Ash.update!()

      {:ok, [invitation]} =
        Chironium.Accounts.find_current_email_invitations(actor: other_user)

      assert {:ok, rejected_invitation} =
               Chironium.Accounts.reject_invitation(invitation.invite_code, actor: other_user)

      assert rejected_invitation.state == :rejected

      # Rejected invitation no longer appears in pending invitations.
      {:ok, []} = Chironium.Accounts.find_current_email_invitations(actor: other_user)

      # User still cannot access the organization.
      assert_raise Ash.Error.Invalid, fn ->
        Ash.get!(Chironium.Accounts.Organization, org.id, actor: other_user)
      end
    end

    test "cannot reject an invitation with an invalid code" do
      actor = generate(user())
      org = generate(organization(actor: actor))

      other_user = generate(user())

      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: other_user.email}]},
        actor: actor
      )
      |> Ash.update!()

      assert {:error, _error} =
               Chironium.Accounts.reject_invitation("INVALID", actor: other_user)
    end

    test "cannot accept an already rejected invitation" do
      actor = generate(user())
      org = generate(organization(actor: actor))

      other_user = generate(user())

      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: other_user.email}]},
        actor: actor
      )
      |> Ash.update!()

      {:ok, [invitation]} =
        Chironium.Accounts.find_current_email_invitations(actor: other_user)

      {:ok, _rejected} =
        Chironium.Accounts.reject_invitation(invitation.invite_code, actor: other_user)

      # The invite_code was cleared on rejection, so accepting with it should fail.
      assert {:error, _error} =
               Chironium.Accounts.accept_invitation(invitation.invite_code, actor: other_user)
    end

    test "can be re-invited after rejecting" do
      owner = generate(user())
      org = generate(organization(actor: owner))

      invite_email = "reinvite@example.com"
      accepting_user = generate(user())

      # First invitation.
      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: invite_email}]},
        actor: owner
      )
      |> Ash.update!()

      [first_invitation] = Ash.load!(org, :invitations, actor: owner).invitations

      # Reject the first invitation.
      {:ok, _} =
        Chironium.Accounts.reject_invitation(first_invitation.invite_code, actor: accepting_user)

      # Invite the same email again to the same organization.
      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: invite_email}]},
        actor: owner
      )
      |> Ash.update!()

      [second_invitation] = Ash.load!(org, :invitations, actor: owner).invitations

      # Accept the second invitation.
      assert {:ok, _} =
               Chironium.Accounts.accept_invitation(second_invitation.invite_code,
                 actor: accepting_user
               )

      # Accepting user can now access the organization.
      Ash.get!(Chironium.Accounts.Organization, org.id, actor: accepting_user)
    end

    test "owner can revoke a pending invitation" do
      owner = generate(user())
      org = generate(organization(actor: owner))
      invitee = generate(user())

      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: invitee.email}]},
        actor: owner
      )
      |> Ash.update!()

      [invitation] = Ash.load!(org, :invitations, actor: owner).invitations

      assert {:ok, revoked_invitation} =
               Ash.update(invitation, %{},
                 action: :revoke,
                 actor: owner,
                 tenant: "org_#{org.id}"
               )

      assert revoked_invitation.state == :rejected

      # Revoked invitations no longer appear in pending invitation lookups.
      {:ok, []} = Chironium.Accounts.find_current_email_invitations(actor: invitee)
    end

    test "non-power users cannot revoke invitations" do
      owner = generate(user())
      org = generate(organization(actor: owner))
      outsider = generate(user())
      invitee = generate(user())

      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: invitee.email}]},
        actor: owner
      )
      |> Ash.update!()

      [invitation] = Ash.load!(org, :invitations, actor: owner).invitations

      assert {:error, %Ash.Error.Forbidden{}} =
               Ash.update(invitation, %{},
                 action: :revoke,
                 actor: outsider,
                 tenant: "org_#{org.id}"
               )
    end

    test "can accept an invitation with a different email address" do
      actor = generate(user())
      org = generate(organization(actor: actor))

      invite_email = "invited-user@example.com"
      accepting_user = generate(user())

      org
      |> Ash.Changeset.for_update(:invite_users, %{invitations: [%{email: invite_email}]},
        actor: actor
      )
      |> Ash.update!()

      org_with_invitations = Ash.load!(org, :invitations, actor: actor)
      [invitation] = org_with_invitations.invitations

      assert invite_email == Ash.CiString.to_comparable_string(invitation.email)

      assert {:ok, _accepted_invitation} =
               Chironium.Accounts.accept_invitation(invitation.invite_code, actor: accepting_user)

      Ash.get!(Chironium.Accounts.Organization, org.id, actor: accepting_user)
    end
  end
end
