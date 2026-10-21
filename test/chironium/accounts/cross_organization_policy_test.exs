defmodule Chironium.Accounts.CrossOrganizationPolicyTest do
  @moduledoc """
  Organization-wide records (organizations, memberships, invitations) are authorized
  against their own organization, not the request's tenant. Anyone can create and own
  an organization, so owning the tenant must not grant power over another organization.
  """
  use Chironium.DataCase, async: false

  require Ash.Query

  import Chironium.Generator

  alias Chironium.Accounts.Invitation
  alias Chironium.Accounts.OrganizationUsers

  setup do
    victim_owner = generate(user())
    victim = generate(organization(actor: victim_owner))

    attacker = generate(user())
    own_organization = generate(organization(actor: attacker))

    OrganizationUsers
    |> Ash.Changeset.for_create(
      :create,
      %{organization_id: victim.id, user_id: attacker.id, role: :member},
      authorize?: false
    )
    |> Ash.create!()

    # What SetTenant puts on a request that names the attacker's own organization.
    attacker_opts = [
      actor: attacker,
      tenant: "org_#{own_organization.id}",
      context: %{access_level: :power_user}
    ]

    %{
      victim: victim,
      victim_owner: victim_owner,
      attacker: attacker,
      attacker_opts: attacker_opts
    }
  end

  test "a member can't invite a manager to the organization", ctx do
    assert {:error, %Ash.Error.Forbidden{}} =
             ctx.victim
             |> Ash.Changeset.for_update(
               :invite_users,
               %{invitations: [%{email: "alt@example.com", role: :power_user}]},
               ctx.attacker_opts
             )
             |> Ash.update()
  end

  test "a member can't update the organization", ctx do
    assert {:error, %Ash.Error.Forbidden{}} =
             ctx.victim
             |> Ash.Changeset.for_update(:update, %{name: "Taken"}, ctx.attacker_opts)
             |> Ash.update()
  end

  test "a member can't promote themselves", ctx do
    membership =
      OrganizationUsers
      |> Ash.Query.filter(organization_id == ^ctx.victim.id and user_id == ^ctx.attacker.id)
      |> Ash.read_one!(authorize?: false)

    assert {:error, %Ash.Error.Forbidden{}} =
             Ash.update(membership, %{role: :power_user}, ctx.attacker_opts)
  end

  test "a member can't revoke the organization's invitations", ctx do
    ctx.victim
    |> Ash.Changeset.for_update(
      :invite_users,
      %{invitations: [%{email: "invitee@example.com", role: :member}]},
      actor: ctx.victim_owner
    )
    |> Ash.update!()

    invitation =
      Invitation
      |> Ash.Query.filter(email == "invitee@example.com")
      |> Ash.read_one!(authorize?: false)

    assert {:error, %Ash.Error.Forbidden{}} =
             Ash.update(invitation, %{}, [action: :revoke] ++ ctx.attacker_opts)
  end
end
