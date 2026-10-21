defmodule ChironiumWeb.PortalController do
  @moduledoc """
  Server-rendered entry points of the patient portal.

  The sign-in link opens a confirm page instead of signing in on `GET`, so
  link previewers (WhatsApp, Outlook SafeLinks) can't use it up. The page is
  rendered by a controller rather than a LiveView, whose join payload would
  carry the token in its URL.
  """

  use ChironiumWeb, :controller

  require Ash.Query

  alias Chironium.Accounts.GuestAccess
  alias Chironium.Accounts.Organization
  alias Chironium.Accounts.Token

  plug :put_root_layout, html: {ChironiumWeb.Layouts, :portal_root}
  plug :put_layout, false

  @sign_in_action "sign_in_with_magic_link"

  def sign_in(conn, %{"token" => token}) when is_binary(token) do
    case pending_access(token) do
      {:ok, guest_access} ->
        organization = organization(guest_access)

        conn
        |> put_locale(organization)
        |> render(:sign_in,
          token: token,
          organization_name: organization && organization.name,
          expires_at: guest_access.expires_at,
          timezone: organization && organization.timezone,
          page_title: gettext("Your questionnaire")
        )

      :error ->
        continue_or_expired(conn)
    end
  end

  def sign_in(conn, _params), do: continue_or_expired(conn)

  @doc "The request page, which needs a live guest session."
  def request(conn, params) do
    if conn.assigns[:current_guest],
      do: app(conn, params),
      else: redirect(conn, to: ~p"/portal/link-expired")
  end

  def app(conn, _params) do
    organization = conn.assigns[:current_guest] && organization(conn.assigns.current_guest)

    conn
    |> put_locale(organization)
    |> render(:app, spa?: true, page_title: gettext("Your questionnaire"))
  end

  @doc "Ends the guest session only; a staff session in the same browser stays."
  def sign_out(conn, _params) do
    case get_session(conn, "guest_token") do
      token when is_binary(token) -> AshAuthentication.TokenResource.Actions.revoke(Token, token)
      _ -> :ok
    end

    conn
    |> delete_session("guest_token")
    |> redirect(to: ~p"/portal/signed-out")
  end

  # A link that was already used still works for the session it started.
  defp continue_or_expired(conn) do
    if conn.assigns[:current_guest],
      do: redirect(conn, to: ~p"/portal"),
      else: redirect(conn, to: ~p"/portal/link-expired")
  end

  # Verifies the token without consuming it; only the POST signs in.
  defp pending_access(token) do
    with {:ok, %{"act" => @sign_in_action, "identity" => id}, GuestAccess} <-
           AshAuthentication.Jwt.verify(token, GuestAccess),
         {:ok, guest_access} <- Ash.get(GuestAccess, id, authorize?: false),
         true <- pending?(guest_access) do
      {:ok, guest_access}
    else
      _ -> :error
    end
  end

  defp pending?(guest_access) do
    is_nil(guest_access.claimed_at) and is_nil(guest_access.revoked_at) and
      DateTime.after?(guest_access.expires_at, DateTime.utc_now())
  end

  defp organization(%GuestAccess{organization_id: organization_id}) do
    case Ash.get(Organization, organization_id, authorize?: false) do
      {:ok, organization} -> organization
      _ -> nil
    end
  end

  # Patients see the organization's language; `Patient.communication` isn't modelled.
  defp put_locale(conn, %Organization{preferred_locale: locale}) when is_binary(locale) do
    Gettext.put_locale(ChironiumWeb.Gettext, locale)
    assign(conn, :locale, locale)
  end

  defp put_locale(conn, _organization), do: conn
end
