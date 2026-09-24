defmodule Chironium.Health.PractitionerPolicyTest do
  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  # ---------------------------------------------------------------------------
  # Reads
  # ---------------------------------------------------------------------------

  describe "reads" do
    test "power user can list practitioners", ctx do
      _prac = create_practitioner(ctx)

      results =
        Chironium.Health.Practitioner |> Ash.read!(actor: ctx.owner, tenant: ctx.tenant)

      assert length(results) == 1
    end

    test "regular member can list practitioners", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)
      _prac = create_practitioner(ctx)

      results =
        Chironium.Health.Practitioner |> Ash.read!(actor: member, tenant: ctx.tenant)

      assert length(results) == 1
    end

    test "practitioner actor can list practitioners", ctx do
      practitioner = create_practitioner(ctx)
      actor = resolve_practitioner_actor(ctx, practitioner)

      results =
        Chironium.Health.Practitioner |> Ash.read!(actor: actor, tenant: ctx.tenant)

      assert Enum.any?(results, &(&1.id == practitioner.id))
    end
  end

  # ---------------------------------------------------------------------------
  # Writes
  # ---------------------------------------------------------------------------

  describe "writes" do
    test "power user can create a practitioner", ctx do
      assert {:ok, _} =
               Chironium.Health.Practitioner
               |> Ash.Changeset.for_create(
                 :create,
                 %{name: [%{text: "Dr. New"}]},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end

    test "power user can update a practitioner", ctx do
      prac = create_practitioner(ctx)

      assert {:ok, updated} =
               prac
               |> Ash.Changeset.for_update(
                 :update,
                 %{active: false},
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.update()

      refute updated.active
    end

    test "power user can destroy a practitioner", ctx do
      prac = create_practitioner(ctx)

      assert :ok =
               prac
               |> Ash.Changeset.for_destroy(:destroy, %{}, actor: ctx.owner, tenant: ctx.tenant)
               |> Ash.destroy()
    end

    test "regular member cannot create a practitioner", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)

      assert {:error, %Ash.Error.Forbidden{}} =
               Chironium.Health.Practitioner
               |> Ash.Changeset.for_create(
                 :create,
                 %{name: [%{text: "Dr. Hijack"}]},
                 actor: member,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end

    test "practitioner actor cannot create another practitioner", ctx do
      practitioner = create_practitioner(ctx)
      actor = resolve_practitioner_actor(ctx, practitioner)

      assert {:error, %Ash.Error.Forbidden{}} =
               Chironium.Health.Practitioner
               |> Ash.Changeset.for_create(
                 :create,
                 %{name: [%{text: "Dr. SelfPromotion"}]},
                 actor: actor,
                 tenant: ctx.tenant
               )
               |> Ash.create()
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
      %{name: [%{text: "Dr. Existing"}]},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp resolve_practitioner_actor(ctx, practitioner) do
    prac_user = generate(user())
    create_membership(ctx.organization.id, prac_user.id, :member)

    Chironium.Accounts.PrincipalGrant
    |> Ash.Changeset.for_create(
      :create,
      %{
        user_id: prac_user.id,
        principal_type: :practitioner,
        principal_id: practitioner.id,
        active: true
      },
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()

    Chironium.Accounts.ActorResolver.resolve(prac_user, ctx.tenant,
      principal_types: [:practitioner]
    )
  end
end
