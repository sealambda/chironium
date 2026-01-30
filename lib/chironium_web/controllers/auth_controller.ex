defmodule ChironiumWeb.AuthController do
  use ChironiumWeb, :controller
  use AshAuthentication.Phoenix.Controller

  alias ChironiumWeb.Plugs.AuthReturnState

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

  def failure(conn, activity, reason) do
    message =
      case {activity, reason} do
        {_,
         %AshAuthentication.Errors.AuthenticationFailed{
           caused_by: %Ash.Error.Forbidden{
             errors: [%AshAuthentication.Errors.CannotConfirmUnconfirmedUser{}]
           }
         }} ->
          """
          You have already signed in another way, but have not confirmed your account.
          You can confirm your account using the link we sent to you, or by resetting your password.
          """

        _ ->
          "Incorrect email or password"
      end

    conn
    |> put_flash(:error, message)
    |> redirect(to: ~p"/sign-in")
  end

  def sign_out(conn, _params) do
    # On sign-out, always redirect to the configured app URL.
    # No need to validate state here since the user is ending their session.
    app_url = Application.get_env(:chironium, :app_url, "/app")

    conn
    |> clear_session(:chironium)
    |> put_flash(:info, "You are now signed out")
    |> redirect_to_app(app_url)
  end

  # Extract and validate the return URL from the signed state token.
  # Falls back to the configured app_url if no valid token is found.
  defp get_validated_return_url(conn) do
    app_url = Application.get_env(:chironium, :app_url, "/app")

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

  # Redirect to app URL, handling both external URLs (development) and internal paths (production).
  defp redirect_to_app(conn, url) when is_binary(url) do
    if String.starts_with?(url, "http://") or String.starts_with?(url, "https://") do
      redirect(conn, external: url)
    else
      redirect(conn, to: url)
    end
  end
end
