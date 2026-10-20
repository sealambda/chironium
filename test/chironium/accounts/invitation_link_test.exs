defmodule Chironium.Accounts.InvitationLinkTest do
  @moduledoc """
  Invitations shared as links: expiry, manager invitations bound to their email,
  who can read the code, and renewing an expired invitation.
  """
  use Chironium.DataCase, async: false
  use Oban.Testing, repo: Chironium.Repo

  require Ash.Query

  import Chironium.Generator

  alias Chironium.Accounts
  alias Chironium.Accounts.Invitation
  alias Chironium.Accounts.OrganizationUsers
  alias Chironium.Accounts.PrincipalGrant
  alias Chironium.Workers.NotificationEmailWorker

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    %{owner: owner, organization: organization, tenant: "org_#{organization.id}"}
  end

  describe "accepting an expired invitation" do
    test "fails on expires_at and creates no membership", ctx do
      invitee = generate(user())
      invitation = invite(ctx, invitee.email) |> expire()

      assert {:error, %Ash.Error.Invalid{errors: [error]}} =
               Accounts.accept_invitation(invitation.invite_code, actor: invitee)

      assert error.field == :expires_at
      assert error.message =~ "Invitation expired on #{Date.to_iso8601(invitation.expires_at)}."
      refute member?(ctx, invitee)
    end

    test "fails when expires_at is NULL", ctx do
      invitee = generate(user())
      invitation = invite(ctx, invitee.email) |> Ash.Seed.update!(%{expires_at: nil})

      assert {:error, %Ash.Error.Invalid{errors: [%{field: :expires_at}]}} =
               Accounts.accept_invitation(invitation.invite_code, actor: invitee)

      refute member?(ctx, invitee)
    end

    test "can still be rejected, so the invitee can clear it", ctx do
      invitee = generate(user())
      invitation = invite(ctx, invitee.email) |> expire()

      assert {:ok, %{state: :rejected}} =
               Accounts.reject_invitation(invitation.invite_code, actor: invitee)
    end

    test "an unexpired invitation still accepts from a different email", ctx do
      invitation = invite(ctx, "someone-else@example.com")
      accepting_user = generate(user())

      assert {:ok, _} = Accounts.accept_invitation(invitation.invite_code, actor: accepting_user)
      assert member?(ctx, accepting_user)
    end

    test "the error reaches GraphQL with the expires_at field", ctx do
      invitee = generate(user())
      invitation = invite(ctx, invitee.email) |> expire()

      assert %{"errors" => [error]} =
               run_graphql(
                 """
                 mutation($inviteCode: String!) {
                   acceptInvitation(inviteCode: $inviteCode) { errors { message fields } }
                 }
                 """,
                 %{"inviteCode" => to_string(invitation.invite_code)},
                 invitee
               )["acceptInvitation"]

      assert error["fields"] == ["expires_at"]
    end
  end

  describe "manager invitations" do
    test "can't be accepted or rejected by a different email, and stay pending", ctx do
      invitation = invite(ctx, "manager@example.com", :power_user)
      intruder = generate(user())

      assert {:error, %Ash.Error.Invalid{errors: [%{field: :email} = error]}} =
               Accounts.accept_invitation(invitation.invite_code, actor: intruder)

      refute error.message =~ "manager@example.com"

      assert {:error, %Ash.Error.Invalid{errors: [%{field: :email}]}} =
               Accounts.reject_invitation(invitation.invite_code, actor: intruder)

      refute member?(ctx, intruder)
      assert Ash.get!(Invitation, invitation.id, authorize?: false).state == :pending
    end

    test "accept for the invited email in different letter case", ctx do
      invitee = generate(user(email: "Manager.Case@Example.com"))
      invitation = invite(ctx, "manager.case@example.com", :power_user)

      assert {:ok, _} = Accounts.accept_invitation(invitation.invite_code, actor: invitee)
      assert member?(ctx, invitee)
    end

    test "the error reaches GraphQL with the email field", ctx do
      invitation = invite(ctx, "manager-gql@example.com", :power_user)

      assert %{"errors" => [error]} =
               run_graphql(
                 """
                 mutation($inviteCode: String!) {
                   acceptInvitation(inviteCode: $inviteCode) { errors { message fields } }
                 }
                 """,
                 %{"inviteCode" => to_string(invitation.invite_code)},
                 generate(user())
               )["acceptInvitation"]

      assert error["fields"] == ["email"]
    end
  end

  test "current_email_invitation excludes expired invitations", ctx do
    invitee = generate(user())
    invite(ctx, invitee.email) |> expire()

    assert {:ok, []} = Accounts.find_current_email_invitations(actor: invitee)
  end

  describe "reading the invite code" do
    test "a member reads nil for invite_code and accept_url; admins read values", ctx do
      invitation = invite(ctx, "reader@example.com")
      member = generate(user())
      power_user = generate(user())
      add_membership(ctx, member, :member)
      add_membership(ctx, power_user, :power_user)

      for actor <- [ctx.owner, power_user] do
        [loaded] = load_invitations(ctx, actor)
        assert loaded.invite_code == invitation.invite_code

        assert loaded.accept_url ==
                 ChironiumWeb.AppUrl.url("", inviteCode: invitation.invite_code)
      end

      [loaded] = load_invitations(ctx, member)
      assert %Ash.ForbiddenField{} = loaded.invite_code
      assert %Ash.ForbiddenField{} = loaded.accept_url
    end

    test "a member reads null through GraphQL", ctx do
      invite(ctx, "reader-gql@example.com")
      member = generate(user())
      add_membership(ctx, member, :member)

      assert %{"invitations" => [invitation]} =
               run_graphql(
                 "query($id: ID!) { getOrganization(id: $id) { invitations { inviteCode acceptUrl } } }",
                 %{"id" => ctx.organization.id},
                 member
               )["getOrganization"]

      assert invitation == %{"inviteCode" => nil, "acceptUrl" => nil}
    end

    test "versions never store the code, and only admins read them", ctx do
      invitation = invite(ctx, "versions@example.com")
      {:ok, renewed} = renew(invitation, ctx.owner)
      member = generate(user())
      add_membership(ctx, member, :member)

      query =
        "query($id: ID!) { getOrganization(id: $id) { invitations { paperTrailVersions { changes } } } }"

      owner_response = run_graphql(query, %{"id" => ctx.organization.id}, ctx.owner)
      member_response = run_graphql(query, %{"id" => ctx.organization.id}, member)

      assert %{"invitations" => [%{"paperTrailVersions" => [_ | _] = versions}]} =
               owner_response["getOrganization"]

      refute Enum.any?(versions, &Map.has_key?(Jason.decode!(&1["changes"]), "invite_code"))

      assert %{"invitations" => [%{"paperTrailVersions" => []}]} =
               member_response["getOrganization"]

      for response <- [owner_response, member_response], code <- [invitation, renewed] do
        refute Jason.encode!(response) =~ to_string(code.invite_code)
      end
    end

    test "accept_url is the app URL with the code", ctx do
      invite(ctx, "url@example.com")
      [loaded] = load_invitations(ctx, ctx.owner)

      assert loaded.accept_url ==
               "#{ChironiumWeb.Endpoint.url()}/app?inviteCode=#{loaded.invite_code}"
    end
  end

  describe "renewing an invitation" do
    test "gives a new code and expiry; only the new code accepts and converts the grant", ctx do
      practitioner =
        Chironium.Health.Practitioner
        |> Ash.Changeset.for_create(:create, %{name: [%{text: "Dr. Renew"}]},
          authorize?: false,
          tenant: ctx.tenant
        )
        |> Ash.create!()

      invitee = generate(user())

      invitation =
        invite(ctx, invitee.email, :member, [
          %{principal_type: :practitioner, principal_id: practitioner.id}
        ])
        |> expire()

      assert {:ok, renewed} = renew(invitation, ctx.owner)
      assert renewed.id == invitation.id
      assert renewed.state == :pending
      assert renewed.invite_code != invitation.invite_code
      assert DateTime.diff(renewed.expires_at, DateTime.utc_now(), :day) == 6

      assert {:error, _} = Accounts.accept_invitation(invitation.invite_code, actor: invitee)
      assert {:ok, _} = Accounts.accept_invitation(renewed.invite_code, actor: invitee)

      assert [%{principal_id: principal_id}] =
               PrincipalGrant
               |> Ash.Query.filter(user_id == ^invitee.id)
               |> Ash.read!(authorize?: false, tenant: ctx.tenant)

      assert principal_id == practitioner.id
    end

    test "members can't renew", ctx do
      invitation = invite(ctx, "renew-member@example.com") |> expire()
      member = generate(user())
      add_membership(ctx, member, :member)

      assert {:error, %Ash.Error.Forbidden{}} = renew(invitation, member)
    end

    test "a power user of another organization can't renew", ctx do
      invitation = invite(ctx, "renew-other@example.com") |> expire()
      other_owner = generate(user())
      other_organization = generate(organization(actor: other_owner))

      assert {:error, %Ash.Error.Forbidden{}} =
               Ash.update(invitation, %{},
                 action: :renew,
                 actor: other_owner,
                 tenant: "org_#{other_organization.id}"
               )
    end

    test "with email on, enqueues the invitation email again", ctx do
      invitation = invite(ctx, "renew-email@example.com") |> expire()

      assert {:ok, renewed} = renew(invitation, ctx.owner)

      assert_enqueued(
        worker: NotificationEmailWorker,
        args: %{
          "type" => "invitation_created",
          "params" => %{"code" => to_string(renewed.invite_code)}
        }
      )
    end
  end

  # -- Helpers -----------------------------------------------------------------

  defp invite(ctx, email, role \\ :member, principal_grants \\ []) do
    ctx.organization
    |> Ash.Changeset.for_update(
      :invite_users,
      %{invitations: [%{email: email, role: role, principal_grants: principal_grants}]},
      actor: ctx.owner
    )
    |> Ash.update!()

    Invitation
    |> Ash.Query.filter(email == ^email)
    |> Ash.read_one!(authorize?: false)
  end

  defp expire(invitation) do
    Ash.Seed.update!(invitation, %{expires_at: DateTime.add(DateTime.utc_now(), -1, :day)})
  end

  defp renew(invitation, actor) do
    Ash.update(invitation, %{}, action: :renew, actor: actor)
  end

  defp add_membership(ctx, user, role) do
    OrganizationUsers
    |> Ash.Changeset.for_create(
      :create,
      %{organization_id: ctx.organization.id, user_id: user.id, role: role},
      authorize?: false
    )
    |> Ash.create!()
  end

  defp load_invitations(ctx, actor) do
    Ash.load!(ctx.organization, [invitations: [:accept_url]], actor: actor).invitations
  end

  defp member?(ctx, user) do
    OrganizationUsers
    |> Ash.Query.filter(organization_id == ^ctx.organization.id and user_id == ^user.id)
    |> Ash.exists?(authorize?: false)
  end

  defp run_graphql(document, variables, actor) do
    {:ok, %{data: data}} =
      Absinthe.run(document, ChironiumWeb.GraphqlSchema,
        variables: variables,
        context: %{actor: actor}
      )

    data
  end
end
