defmodule ChironiumWeb.AuthController do
  use ChironiumWeb, :controller
  use AshAuthentication.Phoenix.Controller

  alias AshAuthentication.Errors.AuthenticationFailed
  alias Chironium.Accounts.GuestAccess
  alias Chironium.Accounts.Token
  alias Chironium.Accounts.Validations.ProviderEmailVerified
  alias Chironium.Health.PatientPrincipalResolver
  alias Chironium.Health.QuestionnaireRequests
  alias ChironiumWeb.Plugs.AuthReturnState

  @unverified_email ProviderEmailVerified.message()

  # Patient questionnaire link: claim it, which revokes its sibling links, then
  # keep the session. The redirect carries no token.
  def success(conn, {:magic_link, _phase}, %GuestAccess{} = guest_access, _token) do
    with {:ok, patient} <- PatientPrincipalResolver.resolve_guest(guest_access),
         {:ok, _claimed} <- QuestionnaireRequests.claim(guest_access, patient) do
      conn
      |> store_in_session(guest_access)
      |> redirect(to: ~p"/portal")
    else
      _ ->
        # Lost a race with another claim: the fresh session token must not survive.
        AshAuthentication.TokenResource.Actions.revoke(Token, guest_access.__metadata__.token)
        redirect(conn, to: ~p"/portal/link-expired")
    end
  end

  # Registration is on, so every address gets a link: the message reveals nothing.
  def success(conn, {:magic_link, :request}, _user, _token) do
    conn
    |> put_flash(:info, gettext("Check your email for a sign-in link."))
    |> redirect(to: ~p"/sign-in")
  end

  def success(conn, _activity, user, _token) do
    # Get the validated return URL from the signed state token.
    # Falls back to configured app_url if no valid token exists.
    return_to = get_validated_return_url(conn)

    conn
    |> delete_session(:auth_return_state)
    |> store_in_session(user)
    |> assign(:current_user, user)
    |> redirect_to_app(return_to)
  end

  # A failed patient questionnaire link goes to the portal, never the staff sign-in page.
  def failure(%{private: %{strategy: %{resource: GuestAccess}}} = conn, _activity, _reason),
    do: redirect(conn, to: ~p"/portal/link-expired")

  def failure(conn, activity, reason) do
    message =
      cond do
        unverified_email?(reason) ->
          gettext(
            "Your sign-in provider has not verified this email address. Verify it with the provider, or sign in another way."
          )

        activity == {:magic_link, :sign_in} ->
          gettext("This sign-in link has expired or was already used. Request a new one.")

        true ->
          gettext("Sign-in failed. Try again, or sign in another way.")
      end

    conn
    |> put_flash(:error, message)
    |> redirect(to: ~p"/sign-in")
  end

  def sign_out(conn, _params) do
    # On sign-out, always redirect to the configured app URL.
    # No need to validate state here since the user is ending their session.
    app_url = Application.get_env(:chironium, :app_url, "/")

    conn
    |> clear_session(:chironium)
    |> put_flash(:info, "You are now signed out")
    |> redirect_to_app(app_url)
  end

  # Extract and validate the return URL from the signed state token.
  # Falls back to the configured app_url if no valid token is found.
  defp get_validated_return_url(conn) do
    app_url = Application.get_env(:chironium, :app_url, "/")

    case get_session(conn, :auth_return_state) do
      nil ->
        app_url

      token ->
        case AuthReturnState.validate_state_token(token) do
          {:ok, return_url} ->
            return_url

          :error ->
            app_url
        end
    end
  end

  defp unverified_email?(%AuthenticationFailed{caused_by: %Ash.Error.Invalid{errors: errors}}),
    do: Enum.any?(errors, &match?(%{message: @unverified_email}, &1))

  defp unverified_email?(_reason), do: false

  # Redirect to app URL, handling both external URLs (development) and internal paths (production).
  defp redirect_to_app(conn, url) when is_binary(url) do
    if String.starts_with?(url, "http://") or String.starts_with?(url, "https://") do
      redirect(conn, external: url)
    else
      redirect(conn, to: url)
    end
  end
end
