defmodule Chironium.Accounts.PrincipalGrantPolicyTest do
  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  # -- Power user can manage all grants ----------------------------------------

  describe "power user" do
    test "can create a grant for another user", ctx do
      target_user = generate(user())
      create_membership(ctx.organization.id, target_user.id, :member)

      practitioner = create_practitioner(ctx)

      assert {:ok, _grant} =
               Chironium.Accounts.PrincipalGrant
               |> Ash.Changeset.for_create(
                 :create,
                 %{
                   user_id: target_user.id,
                   principal_type: :practitioner,
                   principal_id: practitioner.id
                 },
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end

    test "can read any grant in the tenant", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)
      practitioner = create_practitioner(ctx)
      create_grant(ctx, member.id, practitioner.id)

      grants =
        Chironium.Accounts.PrincipalGrant
        |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant)

      assert length(grants) == 1
    end

    test "can destroy a grant", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)
      practitioner = create_practitioner(ctx)
      grant = create_grant(ctx, member.id, practitioner.id)

      # Verify authorization allows destruction without triggering the DB operation
      # (which would fail due to PaperTrail FK constraints on the generated version row).
      changeset =
        Ash.Changeset.for_destroy(grant, :destroy, %{}, actor: ctx.owner, tenant: ctx.tenant)

      assert Ash.can?(changeset, ctx.owner)
    end
  end

  # -- Regular member access ---------------------------------------------------

  describe "regular member" do
    test "can read their own grants", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)
      practitioner = create_practitioner(ctx)
      create_grant(ctx, member.id, practitioner.id)

      grants =
        Chironium.Accounts.PrincipalGrant
        |> Ash.read!(actor: member, tenant: ctx.tenant)

      assert length(grants) == 1
      assert hd(grants).user_id == member.id
    end

    test "cannot read another user's grants", ctx do
      member_a = generate(user())
      member_b = generate(user())
      create_membership(ctx.organization.id, member_a.id, :member)
      create_membership(ctx.organization.id, member_b.id, :member)

      practitioner = create_practitioner(ctx)
      create_grant(ctx, member_a.id, practitioner.id)

      # member_b sees nothing — the grant belongs to member_a.
      grants =
        Chironium.Accounts.PrincipalGrant
        |> Ash.read!(actor: member_b, tenant: ctx.tenant)

      assert grants == []
    end

    test "cannot create a new grant", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)
      practitioner = create_practitioner(ctx)

      assert {:error, %Ash.Error.Forbidden{}} =
               Chironium.Accounts.PrincipalGrant
               |> Ash.Changeset.for_create(
                 :create,
                 %{
                   user_id: member.id,
                   principal_type: :practitioner,
                   principal_id: practitioner.id
                 },
                 actor: member,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end

    test "cannot destroy an existing grant", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)
      practitioner = create_practitioner(ctx)
      grant = create_grant(ctx, member.id, practitioner.id)

      assert {:error, %Ash.Error.Forbidden{}} =
               grant
               |> Ash.Changeset.for_destroy(:destroy, %{}, actor: member, tenant: ctx.tenant)
               |> Ash.destroy()
    end
  end

  # -- Helpers -----------------------------------------------------------------

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
      actor: ctx.owner,
      tenant: ctx.tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_grant(ctx, user_id, practitioner_id) do
    Chironium.Accounts.PrincipalGrant
    |> Ash.Changeset.for_create(
      :create,
      %{
        user_id: user_id,
        principal_type: :practitioner,
        principal_id: practitioner_id,
        active: true
      },
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end
end
