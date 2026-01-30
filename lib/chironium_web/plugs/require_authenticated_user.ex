defmodule ChironiumWeb.Plugs.RequireAuthenticatedUser do
  @moduledoc """
  Plug that requires an authenticated user to access a route.

  If no user is present in the connection assigns (loaded via `:load_from_session`),
  stores the current URL as a signed token in the session and redirects to sign-in.
  After authentication, the user is redirected back to the original URL.

  ## Usage

  Add to a pipeline or scope in the router:

      pipe_through [:browser, :require_authenticated_user]

  Or use directly in a scope:

      plug ChironiumWeb.Plugs.RequireAuthenticatedUser
  """

  import Plug.Conn
  import Phoenix.Controller, only: [redirect: 2]

  use ChironiumWeb, :verified_routes

  @behaviour Plug

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    if conn.assigns[:current_user] do
      conn
    else
      # Build the full request URL (path + query string) for return after auth.
      return_url = current_request_url(conn)

      conn
      |> put_session(:auth_return_state, generate_state_token(return_url))
      |> redirect(to: ~p"/sign-in")
      |> halt()
    end
  end

  # Build the current request URL including query string.
  defp current_request_url(conn) do
    case conn.query_string do
      "" -> conn.request_path
      qs -> "#{conn.request_path}?#{qs}"
    end
  end

  # Generate a signed state token with the return URL.
  # Uses the same format as AuthReturnState for compatibility with AuthController.
  defp generate_state_token(return_url) do
    payload = %{
      return_url: return_url,
      issued_at: System.system_time(:second)
    }

    Phoenix.Token.sign(ChironiumWeb.Endpoint, "auth_return_state", payload)
  end
end

# -----------------------------------------------------------------------------
# Why a Custom Plug?
# -----------------------------------------------------------------------------
#
# This plug follows the standard Phoenix authentication pattern established by
# `mix phx.gen.auth`. Neither Phoenix nor AshAuthentication.Phoenix provide a
# built-in "require authenticated user" plug because:
#
# 1. Authentication requirements vary by application - some apps need email
#    confirmation checks, role-based access, multi-tenancy validation, etc.
#    A generic plug cannot accommodate all use cases.
#
# 2. Separation of concerns - AshAuthentication.Phoenix provides plugs for
#    *loading* authentication state (`load_from_session`, `load_from_bearer`,
#    `store_in_session`), while *enforcing* authentication is left to the
#    application to customize.
#
# 3. Phoenix's philosophy - authentication code is intentionally generated
#    (not imported as a library) so developers own and can modify it. See the
#    `phx.gen.auth` documentation for rationale.
#
# This plug is the controller-route equivalent of `ChironiumWeb.LiveUserAuth`'s
# `:live_user_required` mount hook for LiveViews.
#
# References:
# - Phoenix `mix phx.gen.auth`: https://hexdocs.pm/phoenix/mix_phx_gen_auth.html
# - AshAuthentication.Phoenix.Plug: https://hexdocs.pm/ash_authentication_phoenix/AshAuthentication.Phoenix.Plug.html
# -----------------------------------------------------------------------------
