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
