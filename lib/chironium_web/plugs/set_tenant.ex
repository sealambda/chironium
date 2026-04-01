defmodule ChironiumWeb.SetTenant do
  @moduledoc """
  Establishes the current_tenant on the Conn and resolves the domain actor.

  After verifying organization membership, the plug resolves the authenticated
  User into the appropriate domain principal via `ActorResolver`:

  - **Power users** (org owners / `power_user` role) keep the User as actor.
  - **Regular members** with active principal grants get a domain-specific
    actor (e.g. Practitioner), carrying the authenticated User as metadata.
  - **Members without grants** keep the User as actor (domain policies deny
    access).

  This separation ensures domain-scoped authorization and durable audit trails
  (via PaperTrail `belongs_to_actor`) that outlive the User.
  """
  @behaviour Plug

  alias Chironium.Accounts.Authorization

  @tenant_header "x-chironium-organizationid"

  def init(options), do: options

  def call(conn, _opts) do
    case conn |> Plug.Conn.get_req_header(@tenant_header) do
      [tenant_id] ->
        set_valid_tenant(conn, tenant_id)

      _ ->
        conn
        |> Plug.Conn.assign(:current_tenant, nil)
    end
  end

  defp set_valid_tenant(conn, tenant_id) do
    with {:ok, organization_id} <- Authorization.organization_id_from_tenant(tenant_id),
         %{id: user_id} = user <- conn.assigns[:current_user],
         {:ok, access_level} <- Authorization.resolve_access(user_id, organization_id) do
      conn
      |> Plug.Conn.assign(:current_tenant, tenant_id)
      |> Ash.PlugHelpers.set_tenant(tenant_id)
      |> Ash.PlugHelpers.set_context(%{access_level: access_level})
      |> resolve_actor(user, tenant_id, access_level)
    else
      _ ->
        conn
        |> Plug.Conn.assign(:current_tenant, nil)
        |> Plug.Conn.send_resp(:forbidden, "Forbidden")
        |> Plug.Conn.halt()
    end
  end

  # Power users keep the User as actor (already set by :set_actor plug).
  defp resolve_actor(conn, _user, _tenant, :power_user), do: conn

  # Regular members are resolved to their granted domain principal.
  defp resolve_actor(conn, user, tenant, :member) do
    case Chironium.Accounts.ActorResolver.resolve(user, tenant) do
      %Chironium.Accounts.User{} -> conn
      principal -> Ash.PlugHelpers.set_actor(conn, principal)
    end
  end
end
