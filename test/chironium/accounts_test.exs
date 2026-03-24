defmodule Chironium.AccountsTest do
  require IEx
  use Chironium.DataCase
  import Chironium.Generator

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

    test "can add a user to an organization" do
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

    test "can reject an invitation" do
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

    test "owner can list organization members" do
      owner = generate(user())
      org = generate(organization(actor: owner))

      org_with_relations = Ash.load!(org, [:owner, :users], actor: owner)
      assert org_with_relations.owner.id == owner.id
      assert org_with_relations.users == []
    end

    test "owner sees invited users as members after they accept" do
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

      org_with_users = Ash.get!(Chironium.Accounts.Organization, org.id, actor: owner, load: [:owner, :users])
      assert org_with_users.owner.id == owner.id
      assert [loaded_member] = org_with_users.users
      assert loaded_member.id == member.id
    end

    test "member can list organization members" do
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

      org_with_users = Ash.get!(Chironium.Accounts.Organization, org.id, actor: member, load: [:owner, :users])
      assert org_with_users.owner.id == owner.id
      assert [loaded_member] = org_with_users.users
      assert loaded_member.id == member.id
    end

    test "non-member cannot list organization members" do
      owner = generate(user())
      org = generate(organization(actor: owner))

      outsider = generate(user())

      assert_raise Ash.Error.Invalid, fn ->
        Ash.get!(Chironium.Accounts.Organization, org.id, actor: outsider)
      end
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
