defmodule Chironium.Accounts.OrganizationUpdateTest do
  @moduledoc """
  Tests the authorization rules for updating an organization.

  Owners and power users may update organization details (including the
  preferred locale); regular members may not.
  """
  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))

    %{owner: owner, organization: organization}
  end

  describe ":update action authorization" do
    test "owner can update the organization", ctx do
      assert {:ok, updated} =
               ctx.organization
               |> Ash.Changeset.for_update(:update, %{preferred_locale: "es"}, actor: ctx.owner)
               |> Ash.update()

      assert updated.preferred_locale == "es"
    end

    test "power user can update the preferred locale", ctx do
      power_user = generate(user())
      create_membership(ctx.organization.id, power_user.id, :power_user)

      assert {:ok, updated} =
               ctx.organization
               |> Ash.Changeset.for_update(:update, %{preferred_locale: "es"},
                 actor: power_user
               )
               |> Ash.update()

      assert updated.preferred_locale == "es"
    end

    test "regular member cannot update the organization", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)

      assert {:error, %Ash.Error.Forbidden{}} =
               ctx.organization
               |> Ash.Changeset.for_update(:update, %{preferred_locale: "es"}, actor: member)
               |> Ash.update()
    end

    test "outsider cannot update the organization", ctx do
      outsider = generate(user())

      assert {:error, %Ash.Error.Forbidden{}} =
               ctx.organization
               |> Ash.Changeset.for_update(:update, %{preferred_locale: "es"}, actor: outsider)
               |> Ash.update()
    end
  end

  defp create_membership(organization_id, user_id, role) do
    Chironium.Accounts.OrganizationUsers
    |> Ash.Changeset.for_create(
      :create,
      %{organization_id: organization_id, user_id: user_id, role: role},
      authorize?: false
    )
    |> Ash.create!()
  end
end
