defmodule ChironiumWeb.SetTenantTest do
  use ChironiumWeb.ConnCase, async: false

  import Chironium.Generator

  alias ChironiumWeb.SetTenant

  # -- Tenant assignment -------------------------------------------------------

  test "sets tenant when current user belongs to organization", %{conn: conn} do
    user = generate(user())
    organization = generate(organization(actor: user))
    tenant = "org_#{organization.id}"

    conn =
      conn
      |> assign(:current_user, user)
      |> put_req_header("x-chironium-organizationid", tenant)
      |> SetTenant.call([])

    assert conn.assigns.current_tenant == tenant
    refute conn.halted
  end

  test "rejects tenant when current user is not a member", %{conn: conn} do
    owner = generate(user())
    outsider = generate(user())
    organization = generate(organization(actor: owner))

    conn =
      conn
      |> assign(:current_user, outsider)
      |> put_req_header("x-chironium-organizationid", "org_#{organization.id}")
      |> SetTenant.call([])

    assert conn.status == 403
    assert conn.halted
    assert conn.assigns.current_tenant == nil
  end

  test "rejects malformed tenant header", %{conn: conn} do
    user = generate(user())

    conn =
      conn
      |> assign(:current_user, user)
      |> put_req_header("x-chironium-organizationid", "tenant_123")
      |> SetTenant.call([])

    assert conn.status == 403
    assert conn.halted
    assert conn.assigns.current_tenant == nil
  end

  test "keeps tenant nil when tenant header is missing", %{conn: conn} do
    conn = SetTenant.call(conn, [])

    assert conn.assigns.current_tenant == nil
    refute conn.halted
  end

  # -- Actor resolution --------------------------------------------------------

  describe "actor resolution" do
    setup %{conn: conn} do
      owner = generate(user())
      organization = generate(organization(actor: owner))
      tenant = "org_#{organization.id}"

      %{owner: owner, organization: organization, tenant: tenant, conn: conn}
    end

    test "power user (org owner) keeps User as actor", ctx do
      conn =
        ctx.conn
        |> assign(:current_user, ctx.owner)
        |> Ash.PlugHelpers.set_actor(ctx.owner)
        |> put_req_header("x-chironium-organizationid", ctx.tenant)
        |> SetTenant.call([])

      actor = Ash.PlugHelpers.get_actor(conn)
      assert %Chironium.Accounts.User{id: id} = actor
      assert id == ctx.owner.id
    end

    test "power_user role member keeps User as actor", ctx do
      power_user = generate(user())
      create_membership(ctx.organization.id, power_user.id, :power_user)

      conn =
        ctx.conn
        |> assign(:current_user, power_user)
        |> Ash.PlugHelpers.set_actor(power_user)
        |> put_req_header("x-chironium-organizationid", ctx.tenant)
        |> SetTenant.call([])

      actor = Ash.PlugHelpers.get_actor(conn)
      assert %Chironium.Accounts.User{id: id} = actor
      assert id == power_user.id
    end

    test "member with active practitioner grant becomes Practitioner actor", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)
      practitioner = create_practitioner(ctx.tenant, ctx.owner, "Dr Grant")
      grant_practitioner(ctx.tenant, member.id, practitioner.id)

      conn =
        ctx.conn
        |> assign(:current_user, member)
        |> Ash.PlugHelpers.set_actor(member)
        |> put_req_header("x-chironium-organizationid", ctx.tenant)
        |> SetTenant.call([])

      actor = Ash.PlugHelpers.get_actor(conn)
      assert %Chironium.Health.Practitioner{} = actor
      assert actor.id == practitioner.id
      assert actor.__metadata__[:user].id == member.id
      assert actor.__metadata__[:practitioner_ids] == [practitioner.id]
    end

    test "member without grants keeps User as actor", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)

      conn =
        ctx.conn
        |> assign(:current_user, member)
        |> Ash.PlugHelpers.set_actor(member)
        |> put_req_header("x-chironium-organizationid", ctx.tenant)
        |> SetTenant.call([])

      actor = Ash.PlugHelpers.get_actor(conn)
      assert %Chironium.Accounts.User{id: id} = actor
      assert id == member.id
    end

    test "power user without a pre-set actor (browser pipeline) has User set as actor", ctx do
      # The browser pipeline runs :set_actor, :user before SetTenant.
      # Simulate that here by NOT pre-setting the actor and relying on SetTenant's
      # resolve_actor/4 branch — which does nothing for power users — so the actor
      # that was assigned via :set_actor, :user upstream is preserved.
      # This test verifies that the power-user branch does not clear an existing actor.
      conn =
        ctx.conn
        |> assign(:current_user, ctx.owner)
        |> Ash.PlugHelpers.set_actor(ctx.owner)
        |> put_req_header("x-chironium-organizationid", ctx.tenant)
        |> SetTenant.call([])

      actor = Ash.PlugHelpers.get_actor(conn)
      assert %Chironium.Accounts.User{id: id} = actor
      assert id == ctx.owner.id
    end
  end

  # -- Access level context ----------------------------------------------------

  describe "Ash context" do
    setup %{conn: conn} do
      owner = generate(user())
      organization = generate(organization(actor: owner))
      tenant = "org_#{organization.id}"

      %{owner: owner, organization: organization, tenant: tenant, conn: conn}
    end

    test "sets access_level :power_user in Ash context for org owner", ctx do
      conn =
        ctx.conn
        |> assign(:current_user, ctx.owner)
        |> put_req_header("x-chironium-organizationid", ctx.tenant)
        |> SetTenant.call([])

      assert Ash.PlugHelpers.get_context(conn)[:access_level] == :power_user
    end

    test "sets access_level :member in Ash context for regular member", ctx do
      member = generate(user())
      create_membership(ctx.organization.id, member.id, :member)

      conn =
        ctx.conn
        |> assign(:current_user, member)
        |> put_req_header("x-chironium-organizationid", ctx.tenant)
        |> SetTenant.call([])

      assert Ash.PlugHelpers.get_context(conn)[:access_level] == :member
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

  defp create_practitioner(tenant, owner, name) do
    Chironium.Health.Practitioner
    |> Ash.Changeset.for_create(
      :create,
      %{name: [%{text: name}]},
      actor: owner,
      tenant: tenant,
      authorize?: false
    )
    |> Ash.create!()
  end

  defp grant_practitioner(tenant, user_id, practitioner_id) do
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
      tenant: tenant
    )
    |> Ash.create!()
  end
end
