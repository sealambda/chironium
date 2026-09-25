defmodule ChironiumWeb.Plugs.SetPortalActor do
  @moduledoc """
  Resolves the patient portal's actor and tenant from the guest session.

  The tenant comes from the `GuestAccess`, never from a request header, and
  staff sessions are ignored. Without a live guest session the request is
  rejected with 401.
  """

  @behaviour Plug

  import Plug.Conn

  alias Chironium.Accounts.GuestAccess
  alias Chironium.Health.PatientPrincipalResolver

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    with %GuestAccess{} = guest_access <- conn.assigns[:current_guest],
         {:ok, patient} <- PatientPrincipalResolver.resolve_guest(guest_access) do
      conn
      |> Ash.PlugHelpers.set_tenant(GuestAccess.tenant(guest_access))
      |> Ash.PlugHelpers.set_actor(patient)
      |> assign(:current_patient, patient)
    else
      _ ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(
          :unauthorized,
          Jason.encode!(%{errors: [%{message: "Your link has expired or was already used."}]})
        )
        |> halt()
    end
  end
end
