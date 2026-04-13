defmodule Chironium.Subscriptions.PlanPolicyTest do
  use Chironium.DataCase, async: false

  import Chironium.Generator

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  describe "create policy" do
    test "allows owner to create a plan", ctx do
      assert {:ok, _plan} =
               Chironium.Subscriptions.Plan
               |> Ash.Changeset.for_create(
                 :create,
                 %{
                   name: "Premium",
                   duration: %{value: 1, code: :mo},
                   price_amount: %{amount: "89.99", currency: :EUR}
                 },
                 actor: ctx.owner,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end

    test "forbids regular members from creating a plan", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)

      assert {:error, %Ash.Error.Forbidden{}} =
               Chironium.Subscriptions.Plan
               |> Ash.Changeset.for_create(
                 :create,
                 %{
                   name: "Member Attempt",
                   duration: %{value: 1, code: :mo},
                   price_amount: %{amount: "39.99", currency: :EUR}
                 },
                 actor: member,
                 tenant: ctx.tenant
               )
               |> Ash.create()
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
