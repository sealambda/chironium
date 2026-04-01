defmodule Chironium.Accounts.AuthorizationTest do
  use Chironium.DataCase, async: false

  import Chironium.Generator

  alias Chironium.Accounts.Authorization

  describe "organization_id_from_tenant/1" do
    test "extracts ID from valid tenant string" do
      assert {:ok, "abc-123"} = Authorization.organization_id_from_tenant("org_abc-123")
    end

    test "rejects missing prefix" do
      assert :error = Authorization.organization_id_from_tenant("tenant_abc")
    end

    test "rejects nil" do
      assert :error = Authorization.organization_id_from_tenant(nil)
    end
  end

  describe "organization_accessible?/2" do
    test "owner can access their organization" do
      owner = generate(user())
      org = generate(organization(actor: owner))

      assert Authorization.organization_accessible?(owner.id, org.id)
    end

    test "member can access the organization" do
      owner = generate(user())
      member = generate(user())
      org = generate(organization(actor: owner))
      create_membership(org.id, member.id, :member)

      assert Authorization.organization_accessible?(member.id, org.id)
    end

    test "outsider cannot access the organization" do
      owner = generate(user())
      outsider = generate(user())
      org = generate(organization(actor: owner))

      refute Authorization.organization_accessible?(outsider.id, org.id)
    end
  end

  describe "power_user?/2" do
    test "owner is a power user" do
      owner = generate(user())
      org = generate(organization(actor: owner))

      assert Authorization.power_user?(owner.id, org.id)
    end

    test "power_user role is a power user" do
      owner = generate(user())
      power = generate(user())
      org = generate(organization(actor: owner))
      create_membership(org.id, power.id, :power_user)

      assert Authorization.power_user?(power.id, org.id)
    end

    test "regular member is not a power user" do
      owner = generate(user())
      member = generate(user())
      org = generate(organization(actor: owner))
      create_membership(org.id, member.id, :member)

      refute Authorization.power_user?(member.id, org.id)
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
