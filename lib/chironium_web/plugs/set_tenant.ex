defmodule ChironiumWeb.SetTenant do
  @moduledoc """
  Establishes the current_tenant on the Conn.
  """
  @behaviour Plug

  @tenant_header "x-chironium-organizationid"

  def init(options), do: options

  def call(conn, _opts) do
    case conn |> Plug.Conn.get_req_header(@tenant_header) do
      [tenant_id] ->
        conn
        |> Plug.Conn.assign(:current_tenant, tenant_id)
        |> Ash.PlugHelpers.set_tenant(tenant_id)

      _ ->
        conn
        |> Plug.Conn.assign(:current_tenant, nil)
    end
  end
end
